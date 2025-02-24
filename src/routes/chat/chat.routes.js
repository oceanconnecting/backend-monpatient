import { ChatService } from '../../services/chat/chat.service.js';

export async function chatRoutes(fastify, options) {
  const chatService = new ChatService(fastify.io);

  // Set up socket.io event handlers
  fastify.io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Authenticate the socket connection (Removed authentication for testing)
    socket.on('authenticate', async (token, callback) => {
      callback({ success: true, message: 'Authentication skipped for testing' });
    });

    // Create or get chat room (Removed authentication check)
    socket.on('createRoom', async (data, callback) => {
      try {
        const room = await chatService.createOrGetRoom(
          data.participantId,
          data.participantRole
        );

        socket.join(room.id);
        callback({ success: true, room });
      } catch (error) {
        console.error('Error creating/getting room:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Get user's chat rooms (Removed authentication check)
    socket.on('getRooms', async (_, callback) => {
      try {
        const rooms = await chatService.getUserRooms();
        callback({ success: true, rooms });
      } catch (error) {
        console.error('Error getting rooms:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Get room messages (Removed authentication and room membership check)
    socket.on('getRoomMessages', async (roomId, callback) => {
      try {
        const messages = await chatService.getRoomMessages(roomId);
        callback({ success: true, messages });
      } catch (error) {
        console.error('Error getting messages:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Send message (Removed authentication and room membership check)
    socket.on('sendMessage', async (data, callback) => {
      try {
        const message = await chatService.sendMessage(
          data.roomId,
          data.content
        );

        fastify.io.to(data.roomId).emit('newMessage', message);
        callback({ success: true, message });
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Mark messages as read (Removed authentication check)
    socket.on('markMessagesAsRead', async (roomId, callback) => {
      try {
        await chatService.markMessagesAsRead(roomId);

        socket.to(roomId).emit('messagesRead', { roomId });
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

  // Health check endpoint
  fastify.get('/health', {
    handler: async (request, reply) => {
      return { status: 'ok', connections: Object.keys(fastify.io.sockets.sockets).length };
    }
  });
}
