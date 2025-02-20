import { ChatService } from '../../services/chat/chat.service.js';

export async function chatRoutes(fastify, options) {
  const chatService = new ChatService(fastify.io);
  
  // Set up socket.io event handlers
  fastify.io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Authenticate the socket connection
    socket.on('authenticate', async (token, callback) => {
      try {
        const decoded = fastify.jwt.verify(token);
        socket.user = decoded;
        
        // Join user's rooms
        const rooms = await chatService.getUserRooms(decoded.id, decoded.role);
        rooms.forEach(room => {
          socket.join(room.id);
        });
        
        callback({ success: true, userId: decoded.id, role: decoded.role });
      } catch (error) {
        console.error('Authentication error:', error);
        callback({ success: false, error: 'Authentication failed' });
      }
    });
    
    // Create or get chat room
    socket.on('createRoom', async (data, callback) => {
      try {
        if (!socket.user) {
          return callback({ success: false, error: 'Not authenticated' });
        }
        
        if (socket.user.role !== 'PATIENT') {
          return callback({ success: false, error: 'Only patients can initiate chats' });
        }
        
        if (!socket.user.patient || !socket.user.patient.id) {
          return callback({ success: false, error: 'Patient data not found' });
        }
        
        const room = await chatService.createOrGetRoom(
          socket.user.patient.id,
          data.participantId,
          data.participantRole
        );
        
        // Join the room
        socket.join(room.id);
        
        callback({ success: true, room });
      } catch (error) {
        console.error('Error creating/getting room:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // Get user's chat rooms
    socket.on('getRooms', async (_, callback) => {
      try {
        if (!socket.user) {
          return callback({ success: false, error: 'Not authenticated' });
        }
        
        const rooms = await chatService.getUserRooms(
          socket.user.id,
          socket.user.role
        );
        
        callback({ success: true, rooms });
      } catch (error) {
        console.error('Error getting rooms:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // Get room messages
    socket.on('getRoomMessages', async (roomId, callback) => {
      try {
        if (!socket.user) {
          return callback({ success: false, error: 'Not authenticated' });
        }
        
        const messages = await chatService.getRoomMessages(
          roomId,
          socket.user.id
        );
        
        callback({ success: true, messages });
      } catch (error) {
        console.error('Error getting messages:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // Send message
    socket.on('sendMessage', async (data, callback) => {
      try {
        if (!socket.user) {
          return callback({ success: false, error: 'Not authenticated' });
        }
        
        const message = await chatService.sendMessage(
          data.roomId,
          socket.user.id,
          socket.user.role,
          data.content
        );
        
        // Broadcast to room members
        fastify.io.to(data.roomId).emit('newMessage', message);
        
        callback({ success: true, message });
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // Mark messages as read
    socket.on('markMessagesAsRead', async (roomId, callback) => {
      try {
        if (!socket.user) {
          return callback({ success: false, error: 'Not authenticated' });
        }
        
        await chatService.markMessagesAsRead(
          roomId,
          socket.user.id
        );
        
        // Notify other room members that messages were read
        socket.to(roomId).emit('messagesRead', {
          roomId,
          userId: socket.user.id
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('Error marking messages as read:', error);
        callback({ success: false, error: error.message });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Keep a minimal HTTP endpoint for health check
  fastify.get('/health', {
    handler: async (request, reply) => {
      return { status: 'ok', connections: Object.keys(fastify.io.sockets.sockets).length };
    }
  });
}