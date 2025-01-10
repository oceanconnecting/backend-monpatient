import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { Server } from 'socket.io'
import { createServer } from 'http'
import { authRoutes } from './routes/auth.routes.js'
import { adminRoutes } from './routes/admin.routes.js'
import { doctorPatientRoutes } from './routes/doctor-patient.routes.js'
import { nurseServiceRoutes } from './routes/nurse-service.routes.js'
import { notificationRoutes } from './routes/notification.routes.js'
import { chatRoutes } from './routes/chat.routes.js'
import { createAuthMiddleware } from './middleware/auth.middleware.js'
import { createNotificationMiddleware } from './middleware/notification.middleware.js'

const fastify = Fastify({ 
  logger: true,
  trustProxy: true,
  ajv: {
    customOptions: {
      removeAdditional: false,
      useDefaults: true,
      coerceTypes: true,
      allErrors: true,
    }
  }
})

const prisma = new PrismaClient()

// Create HTTP server
const httpServer = createServer(fastify.server)

// Create Socket.IO instance
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
})

// Make fastify instance available to Socket.IO
io.fastify = fastify

// Make io available to routes
fastify.decorate('io', io)

// Register plugins
await fastify.register(cors, {
  origin: true // Allow all origins in development
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET
})

// Register authentication middleware
fastify.decorate('authenticate', createAuthMiddleware(fastify))

// Register notification middleware
fastify.addHook('onRequest', createNotificationMiddleware(fastify))

// Register routes
await fastify.register(authRoutes, { prefix: '/auth' })
await fastify.register(adminRoutes, { prefix: '/admin' })
await fastify.register(doctorPatientRoutes, { prefix: '/doctor-patient' })
await fastify.register(nurseServiceRoutes, { prefix: '/nurse-service' })
await fastify.register(notificationRoutes, { prefix: '/api' })
await fastify.register(chatRoutes, { prefix: '/chat' })

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  
  // Handle validation errors
  if (error.validation) {
    reply.status(400).send({
      error: 'Validation Error',
      message: error.message
    })
    return
  }

  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message
  })
})

// For local development
if (import.meta.url === `file://${process.argv[1]}`) {
  const start = async () => {
    try {
      await fastify.listen({ port: process.env.PORT || 3001, host: '0.0.0.0' })
      httpServer.listen(process.env.WS_PORT || 3002)
    } catch (err) {
      fastify.log.error(err)
      process.exit(1)
    }
  }
  start()
}

// Export for Vercel
export default async (req, res) => {
  await fastify.ready()
  fastify.server.emit('request', req, res)
}
