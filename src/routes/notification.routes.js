import { getUnreadNotifications, markNotificationAsRead, deleteNotification } from '../middleware/notification.middleware.js'
import { checkRole } from '../middleware/auth.middleware.js'

export async function notificationRoutes(fastify) {
  // Get all unread notifications for the authenticated user
  fastify.get('/notifications/unread', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notifications = await getUnreadNotifications(request.user.id, request.user.role)
        return notifications
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  // Mark a notification as read
  fastify.put('/notifications/:id/read', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        const notification = await markNotificationAsRead(
          parseInt(id), 
          request.user.id,
          request.user.role
        )
        return notification
      } catch (error) {
        reply.code(404).send({ error: error.message })
      }
    }
  })

  // Delete a notification (admin only)
  fastify.delete('/notifications/:id', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params
        await deleteNotification(parseInt(id), request.user.id)
        reply.code(204).send()
      } catch (error) {
        reply.code(404).send({ error: error.message })
      }
    }
  })
}
