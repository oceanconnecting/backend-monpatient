import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function createNotificationMiddleware(fastify) {
  return async function notificationHandler(request, reply) {
    // Store the request start time
    request.startTime = Date.now()

    // Execute route handler
    reply.then(async () => {
      try {
        if (!request.user) return // Skip if no authenticated user

        // Create notification based on the request
        const notification = await prisma.notification.create({
          data: {
            userId: request.user.id,
            type: 'REQUEST',
            title: `${request.method} ${request.url}`,
            message: `Request to ${request.url} completed with status ${reply.statusCode}`,
            read: false,
            metadata: {
              method: request.method,
              url: request.url,
              statusCode: reply.statusCode,
              duration: Date.now() - request.startTime
            }
          }
        })

        // Emit notification through websocket if available
        if (fastify.io) {
          fastify.io.to(`user:${request.user.id}`).emit('notification', notification)
        }
      } catch (error) {
        fastify.log.error('Failed to create notification:', error)
      }
    })
  }
}

export async function getUnreadNotifications(userId) {
  return prisma.notification.findMany({
    where: {
      userId,
      read: false
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function markNotificationAsRead(notificationId, userId) {
  return prisma.notification.update({
    where: {
      id: notificationId,
      userId // Ensure the notification belongs to the user
    },
    data: {
      read: true
    }
  })
}

export async function deleteNotification(notificationId, userId) {
  return prisma.notification.delete({
    where: {
      id: notificationId,
      userId // Ensure the notification belongs to the user
    }
  })
}