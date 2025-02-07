import { ChatService } from '../services/chat.service.js'

export async function chatRoutes(fastify, options) {
  const chatService = new ChatService(fastify.io)
  // Create or get chat room
  fastify.post('/room', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['participantId', 'participantRole'],
        properties: {
          participantId: { type: 'number' },
          participantRole: { type: 'string', enum: ['DOCTOR'] }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        if (request.user.role !== 'PATIENT') {
          throw new Error('Only patients can initiate chats')
        }
        if (!request.user.patient || !request.user.patient.id) {
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
  // Send message
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
        return { success: true }
      } catch (error) {
        console.error('Error marking messages as read:', error)
        reply.code(400).send({ error: error.message })
      }
    }
  })
}
