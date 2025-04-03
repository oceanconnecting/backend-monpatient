import { PrismaClient } from '@prisma/client'

// Initialize Prisma with query logging in development
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})


export function createNotificationMiddleware(fastify, options = {}) {
  const debug = options.debug ?? (process.env.NODE_ENV === 'development')
  const logPerformance = options.logPerformance ?? true
  const excludePaths = options.excludePaths ?? ['/health']
  const batchInterval = options.batchInterval ?? 1000 // ms to batch notifications

  // Storage for notification batch processing
  const notificationQueue = new Map()
  let batchTimeoutId = null

  // Process notifications in batch
  const processBatch = async () => {
    if (notificationQueue.size === 0) return

    const batch = Array.from(notificationQueue.values())
    notificationQueue.clear()
    
    try {
      await prisma.$transaction(
        batch.map(item => 
          prisma.notification.create({ data: item })
        )
      )
      
      if (debug) {
        fastify.log.info(`Processed batch of ${batch.length} notifications`)
      }
      
      // Emit notifications through websocket
      batch.forEach(notification => {
        if (fastify.io) {
          fastify.io.to(`user:${notification.userId}`).emit('notification', notification)
        }
      })
    } catch (error) {
      fastify.log.error('Failed to process notification batch:', error)
    }
  }

  // Schedule batch processing
  const scheduleBatch = () => {
    if (batchTimeoutId) clearTimeout(batchTimeoutId)
    batchTimeoutId = setTimeout(processBatch, batchInterval)
  }

  // Return the actual middleware function
  return async function notificationHandler(request, reply) {
    // Skip excluded paths
    if (excludePaths.some(path => request.url.includes(path))) {
      if (debug) fastify.log.debug(`Skipping notification for excluded path: ${request.url}`)
      return
    }

    // Start performance monitoring
    const startTime = Date.now()
    request.startTime = startTime
    
    if (debug) {
      fastify.log.debug({
        msg: 'Request started',
        method: request.method,
        url: request.url,
        userId: request.user ? request.user.id : 'unauthenticated'
      })
    }

    // Execute route handler
    reply.then(async () => {
      try {
        const endTime = Date.now()
        const duration = endTime - startTime
        
        if (logPerformance && duration > 500) {
          fastify.log.warn({
            msg: 'Slow request detected',
            method: request.method,
            url: request.url,
            duration: `${duration}ms`
          })
        }
        
        if (debug) {
          fastify.log.debug({
            msg: 'Request completed',
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration: `${duration}ms`
          })
        }

        // Skip notification creation if no authenticated user
        if (!request.user) {
          if (debug) fastify.log.debug('Skipping notification: No authenticated user')
          return
        }

        // Create notification data
        const notificationData = {
          userId: request.user.id,
          type: 'REQUEST',
          title: `${request.method} ${request.url}`,
          message: `Request to ${request.url} completed with status ${reply.statusCode}`,
          read: false,
          metadata: {
            method: request.method,
            url: request.url,
            statusCode: reply.statusCode,
            duration,
            timestamp: new Date().toISOString()
          }
        }

        // Add to queue for batch processing
        const queueKey = `${request.user.id}-${Date.now()}`
        notificationQueue.set(queueKey, notificationData)
        scheduleBatch()
        
      } catch (error) {
        fastify.log.error({
          msg: 'Failed to create notification',
          error: error.message,
          stack: debug ? error.stack : undefined
        })
      }
    })
  }
}

/**
 * Get unread notifications for a user
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Unread notifications with pagination
 */
export async function getUnreadNotifications(userId, userRole, options = {}) {
  const limit = options.limit ?? 100
  const page = options.page ?? 1
  const debug = options.debug ?? false
  
  const skip = (page - 1) * limit
  
  try {
    // Query timing
    const startTime = Date.now()
    
    // For admin, return all notifications
    const where = userRole === 'ADMIN' 
      ? { read: false } 
      : { userId, read: false }
    
    // Execute queries in parallel
    const notificationsPromise = prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip
    })
    
    const countPromise = prisma.notification.count({ where })
    
    const [notifications, count] = await Promise.all([notificationsPromise, countPromise])
    
    if (debug) {
      const duration = Date.now() - startTime
      console.debug(`Query executed in ${duration}ms, found ${count} unread notifications`)
    }
    
    return { 
      notifications,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching unread notifications:', error)
    throw error
  }
}

/**
 * Get all notifications with pagination
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notifications with pagination info
 */
export async function getAllNotifications(userId, userRole, options = {}) {
  const limit = options.limit ?? 50
  const page = options.page ?? 1
  const includeUser = options.includeUser ?? true
  const sortBy = options.sortBy ?? 'createdAt'
  const sortOrder = options.sortOrder ?? 'desc'
  const filterByType = options.filterByType ?? null
  const search = options.search ?? null
  
  const skip = (page - 1) * limit
  
  try {
    // Base query conditions
    let where = {}
    
    // Apply role-based access
    if (userRole !== 'ADMIN') {
      where.userId = userId
    }
    
    // Apply type filter if provided
    if (filterByType) {
      where.type = filterByType
    }
    
    // Apply search if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Setup order
    const orderBy = { [sortBy]: sortOrder }
    
    // Setup include
    const include = includeUser ? {
      user: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          role: true
        }
      }
    } : undefined
    
    // Execute queries in parallel
    const notificationsPromise = prisma.notification.findMany({
      where,
      include,
      orderBy,
      take: limit,
      skip
    })
    
    const countPromise = prisma.notification.count({ where })
    
    const [notifications, count] = await Promise.all([notificationsPromise, countPromise])
    
    return { 
      notifications,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

/**
 * Create a new notification
 * @param {Object} data - Notification data
 * @param {string} userId - User ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(data, userId, options = {}) {
  const sendWebsocket = options.sendWebsocket ?? true
  const fastify = options.fastify ?? null
  
  if (!data.title || !data.message || !data.type) {
    throw new Error('Missing required notification fields')
  }
  
  try {
    // Add timestamp if not present
    if (!data.metadata) data.metadata = {}
    if (!data.metadata.timestamp) data.metadata.timestamp = new Date().toISOString()
    
    const notification = await prisma.notification.create({
      data: {
        ...data,
        userId,
        read: false
      }
    })
    
    // Emit through websocket if requested
    if (sendWebsocket && fastify && fastify.io) {
      fastify.io.to(`user:${userId}`).emit('notification', notification)
    }
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(notificationId, userId, userRole) {
  try {
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
      error.statusCode = 403
      throw error
    }
    
    return prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Deleted notification
 */
export async function deleteNotification(notificationId, userId, userRole) {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })
    
    if (!notification) {
      throw new Error('Notification not found')
    }
    
    // If user is not an admin, ensure they own the notification
    if (userRole !== 'ADMIN' && notification.userId !== userId) {
      const error = new Error('Unauthorized to delete this notification')
      error.name = 'UnauthorizedError'
      error.statusCode = 403
      throw error
    }
    
    return prisma.notification.delete({
      where: { id: notificationId }
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

/**
 * Delete all notifications for a user
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAllNotifications(userId, userRole) {
  try {
    const where = userRole === 'ADMIN' ? {} : { userId }
    
    return prisma.notification.deleteMany({ where })
  } catch (error) {
    console.error('Error deleting all notifications:', error)
    throw error
  }
}

/**
 * Get notification statistics
 * @param {string} userId - User ID (optional for admin)
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Statistics
 */
export async function getNotificationStats(userId, userRole) {
  try {
    const where = userRole === 'ADMIN' ? {} : { userId }
    
    const totalPromise = prisma.notification.count({ where })
    const unreadPromise = prisma.notification.count({ where: { ...where, read: false } })
    const typeCountsPromise = prisma.notification.groupBy({
      by: ['type'],
      where,
      _count: true
    })
    
    const [total, unread, typeCounts] = await Promise.all([
      totalPromise, unreadPromise, typeCountsPromise
    ])
    
    // Format type counts
    const byType = {}
    typeCounts.forEach(item => {
      byType[item.type] = item._count
    })
    
    return {
      total,
      unread,
      byType
    }
  } catch (error) {
    console.error('Error getting notification stats:', error)
    throw error
  }
}