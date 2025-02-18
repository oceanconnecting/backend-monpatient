import { 
  getUnreadNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  getAllNotifications, 
  createNotification 
} from '../../middleware/notification.middleware.js'
import { checkRole } from '../../middleware/auth.middleware.js'

export async function notificationRoutes(fastify) {
  //Get all notifications
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notifications = await getAllNotifications(request.user.id, request.user.role)
        return notifications
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
  //Get all unread notifications for the authenticated user
  fastify.get('/unread', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notifications = await getUnreadNotifications(request.user.id, request.user.role)
        return notifications
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
  // Mark a notification as read
  fastify.put('/:id/read', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const notification = await markNotificationAsRead(id, 
          request.user.id,
          request.user.role
        )
        return notification
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message })
        } else if (error.message === 'Notification not found') {
          reply.code(404).send({ error: error.message })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
  // Create a new notification (admin only)
  fastify.post('/', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notification = await createNotification(request.body, request.user.id)
        reply.code(201).send(notification)
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
  // Delete a notification (admin only)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        await deleteNotification(id, request.user.id)
        reply.code(204).send()
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message })
        } else if (error.message === 'Notification not found') {
          reply.code(404).send({ error: error.message })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
}
