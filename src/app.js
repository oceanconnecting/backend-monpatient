import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { doctorPatientRoutes } from './routes/doctor-patient.routes.js'
import { chatRoutes } from './routes/chat.routes.js'
import { notificationRoutes } from './routes/notification.routes.js'
import { createAuthMiddleware } from './middleware/auth.middleware.js'

export async function buildApp(app) {
  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  })

  // Add authentication hook
  app.decorate('authenticate', createAuthMiddleware(app))

  // Register routes
  app.register(doctorPatientRoutes, { prefix: '/api/doctor-patient' })
  app.register(chatRoutes, { prefix: '/api/chat' })
  app.register(notificationRoutes, { prefix: '/api/notifications' })

  return app
}

export async function createApp() {
  const app = fastify({
    logger: true
  })
  
  await buildApp(app)
  return app
}
