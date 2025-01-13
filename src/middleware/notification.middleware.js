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

export async function getUnreadNotifications(userId, userRole) {
  // For admin, return all notifications
  if (userRole === 'ADMIN') {
    return prisma.notification.findMany({
      where: {
        read: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  // For other roles, return only their notifications
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

export async function getAllNotifications(userId, userRole) {
  // For admin, return all notifications
  if (userRole === 'ADMIN') {
    return prisma.notification.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  // For other roles, return only their notifications
  return prisma.notification.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function createNotification(data, userId) {
  if (!data.title || !data.message || !data.type) {
    throw new Error('Missing required notification fields')
  }

  return prisma.notification.create({
    data: {
      ...data,
      userId,
      read: false
    }
  })
}

export async function markNotificationAsRead(notificationId, userId, userRole) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  })

  if (!notification) {
    throw new Error('Notification not found')
  }

  // If user is not an admin, ensure they own the notification
  if (userRole !== 'ADMIN' && notification.userId !== userId) {
    const error = new Error('Unauthorized to mark this notification as read')
    error.name = 'UnauthorizedError'
    throw error
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })
}

export async function deleteNotification(notificationId, userId) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  })

  if (!notification) {
    throw new Error('Notification not found')
  }

  return prisma.notification.delete({
    where: { id: notificationId }
  })
}