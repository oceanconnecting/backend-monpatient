import { ChatService } from '../../services/chat.service.js';
import { checkRole } from '../../middleware/auth.middleware.js';

export async function chatRoutes(fastify) {
    
  fastify.get('/messages', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const messages = await ChatService.getAllMessages();
        return messages;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.get('/messages/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        if (isNaN(id)) {
          return reply.code(400).send({ error: 'Invalid message ID' });
        }
        const message = await ChatService.getMessageById(id);
        return message;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/messages', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const newMessage = await ChatService.createMessage(request.body);
        return newMessage;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/messages/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const result = await ChatService.deleteMessage(request.params.id);
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}
