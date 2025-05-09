import { ChatService } from '../../services/chat/chat.service.js'

export async function chatRoutes(fastify) {
  const chatService = new ChatService(fastify)
  
  // HTTP API Routes
  
  // Create or get chat room
  fastify.post('/room', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['participantId', 'participantRole'],
        properties: {
          participantId: { type: 'string' },
          participantRole: { type: 'string', enum: ['DOCTOR'] }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        if (request.user.role !== 'PATIENT') {
          throw new Error('Only patients can initiate chats')
        }
        if (!request.user.patient?.id) {
          throw new Error('Patient data not found')
        }
        const room = await chatService.createOrGetRoom(
          request.user.patient.id,
          request.body.participantId,
          request.body.participantRole
        )
        return room
      } catch (error) {
        console.error('Error creating/getting room:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
  
  // Get user's chat rooms
  fastify.get('/rooms', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const rooms = await chatService.getUserRooms(
          request.user.id,
          request.user.role
        )
        return rooms
      } catch (error) {
        console.error('Error getting rooms:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
  
  // Get room messages
  fastify.get('/room/:roomId/messages', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const messages = await chatService.getRoomMessages(
          request.params.roomId,
          request.user.id
        )
        return messages
      } catch (error) {
        console.error('Error getting messages:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
  
  // Send message (HTTP)
  fastify.post('/room/:roomId/message', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const message = await chatService.sendMessage(
          request.params.roomId,
          request.user.id,
          request.user.role,
          request.body.content
        )
        // Broadcast the message to connected websocket clients
        chatService.broadcastToRoom(request.params.roomId, {
          event: 'new-message',
          message: message
        })
        return message
      } catch (error) {
        console.error('Error sending message:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
  
  // Mark messages as read
  fastify.post('/room/:roomId/messages/read', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        await chatService.markMessagesAsRead(
          request.params.roomId,
          request.user.id
        )
        // Broadcast read status to connected websocket clients
        chatService.broadcastToRoom(request.params.roomId, {
          event: 'messages-read',
          userId: request.user.id,
          roomId: request.params.roomId
        })
        return { success: true }
      } catch (error) {
        console.error('Error marking messages as read:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
  
  // WebSocket route - single connection point for all chat functionality
  fastify.get('/ws', { 
    websocket: true
  }, (connection, req) => {
    // Parse token from URL or headers
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;
    
    if (!token) {
      connection.socket.send(JSON.stringify({ 
        error: 'Authentication required' 
      }));
      connection.socket.close();
      return;
    }
    
    // Verify token and get user
    try {
      const decoded = fastify.jwt.verify(token);
      const userId = decoded.user.id;
      console.log(`WebSocket connected: User ${userId}`);
      
      // Handle incoming messages
      connection.socket.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // Handle different message types
          switch(data.type) {
            case 'join-room':
              // Join a specific chat room
              console.log(`User ${userId} joined room ${data.roomId}`);
              // Your logic for room joining
              break;
              
            case 'send-message':
              // Handle sending a new message
              if (data.roomId && data.content) {
                const userRole = decoded.role;
                const message = await chatService.sendMessage(
                  data.roomId,
                  userId,
                  userRole,
                  data.content
                );
                
                // Broadcast to room
                chatService.broadcastToRoom(data.roomId, {
                  event: 'new-message',
                  message: message
                });
                
                // Confirm to sender
                connection.socket.send(JSON.stringify({
                  event: 'message-sent',
                  message: message
                }));
              }
              break;
              
            case 'mark-read':
              // Mark messages as read
              if (data.roomId) {
                await chatService.markMessagesAsRead(data.roomId, userId);
                
                // Broadcast read status
                chatService.broadcastToRoom(data.roomId, {
                  event: 'messages-read',
                  userId: userId,
                  roomId: data.roomId
                });
              }
              break;
              
            default:
              connection.socket.send(JSON.stringify({
                error: 'Unknown message type'
              }));
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
          connection.socket.send(JSON.stringify({
            error: 'Error processing message'
          }));
        }
      });
      
      // Handle disconnection
      connection.socket.on('close', () => {
        console.log(`WebSocket disconnected: User ${userId}`);
        // Clean up any resources
      });
      
    } catch (err) {
      console.error('WebSocket authentication error:', err);
      connection.socket.send(JSON.stringify({ 
        error: 'Invalid authentication' 
      }));
      connection.socket.close();
    }
  });
}