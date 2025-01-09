import { getUnreadNotifications, markNotificationAsRead, deleteNotification } from '../middleware/notification.middleware.js'

export async function notificationRoutes(fastify) {
  // Get all unread notifications for the authenticated user
  fastify.get('/notifications/unread', {
    handler: async (request, reply) => {
      const notifications = await getUnreadNotifications(request.user.id)
      return notifications
    }
  })

  // Mark a notification as read
  fastify.put('/notifications/:id/read', {
    handler: async (request, reply) => {
      const { id } = request.params
      const notification = await markNotificationAsRead(parseInt(id), request.user.id)
      return notification
    }
  })

  // Delete a notification
  fastify.delete('/notifications/:id', {
    handler: async (request, reply) => {
      const { id } = request.params
      await deleteNotification(parseInt(id), request.user.id)
      return { success: true }
    }
  })
}
