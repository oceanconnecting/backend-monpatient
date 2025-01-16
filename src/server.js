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
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  },
  trustProxy: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      useDefaults: true,
      coerceTypes: true,
      allErrors: true
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
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Make fastify instance available to Socket.IO
io.fastify = fastify

// Make io available to routes
fastify.decorate('io', io)

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET,
  sign: {
    expiresIn: '1d'
  }
})

// Register authentication middleware
fastify.decorate('authenticate', createAuthMiddleware(fastify))

// Register notification middleware
fastify.addHook('onRequest', createNotificationMiddleware(fastify))

// Register routes with API versioning prefix
const apiPrefix = '/api'
await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` })
await fastify.register(adminRoutes, { prefix: `${apiPrefix}/admin` })
await fastify.register(doctorPatientRoutes, { prefix: `${apiPrefix}/doctor-patient` })
await fastify.register(nurseServiceRoutes, { prefix: `${apiPrefix}/nurse-service` })
await fastify.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` })
await fastify.register(chatRoutes, { prefix: `${apiPrefix}/chat` })

// Health check route
fastify.get('/health', {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    }
  }
}, async () => {
  return { 
    status: 'ok',
    timestamp: new Date().toISOString()
  }
})

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  request.log.error(error)
  
  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message,
      details: error.validation
    })
  }

  // Handle JWT errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: error.message
    })
  }

  // Handle Prisma errors
  if (error.code?.startsWith('P')) {
    return reply.status(400).send({
      error: 'Database Error',
      message: error.message
    })
  }

  reply.status(error.statusCode || 500).send({
    error: error.name || 'Internal Server Error',
    message: error.message
  })
})

// Close Prisma when the server shuts down
fastify.addHook('onClose', async () => {
  await prisma.$disconnect()
})

// For local development
if (import.meta.url === `file://${process.argv[1]}`) {
  const start = async () => {
    try {
      await fastify.listen({ 
        port: process.env.PORT || 3001, 
        host: '0.0.0.0' 
      })
      console.log(`Server listening at http://localhost:${process.env.PORT || 3001}`)
      
      httpServer.listen(process.env.WS_PORT || 3002, () => {
        console.log(`WebSocket server listening at ws://localhost:${process.env.WS_PORT || 3002}`)
      })
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
