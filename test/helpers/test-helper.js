import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from '../../src/routes/auth.routes.js'
import { adminRoutes } from '../../src/routes/admin.routes.js'
import { doctorPatientRoutes } from '../../src/routes/doctor-patient.routes.js'
import { nurseServiceRoutes } from '../../src/routes/nurse-service.routes.js'
import { notificationRoutes } from '../../src/routes/notification.routes.js'
import { chatRoutes } from '../../src/routes/chat.routes.js'
import { createAuthMiddleware } from '../../src/middleware/auth.middleware.js'
import { createNotificationMiddleware } from '../../src/middleware/notification.middleware.js'

const prisma = new PrismaClient()

export async function createTestApp() {
  const app = Fastify({
    logger: false, // Disable logging in tests
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: true,
        allErrors: true
      }
    }
  })

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })

  await app.register(jwt, {
    secret: 'test-secret-key',
    sign: {
      expiresIn: '1d'
    }
  })

  // Register authentication middleware
  app.decorate('authenticate', createAuthMiddleware(app))

  // Register notification middleware
  app.addHook('onRequest', createNotificationMiddleware(app))

  // Register routes
  const apiPrefix = '/api'
  await app.register(authRoutes, { prefix: `${apiPrefix}/auth` })
  await app.register(adminRoutes, { prefix: `${apiPrefix}/admin` })
  await app.register(doctorPatientRoutes, { prefix: `${apiPrefix}/doctor-patient` })
  await app.register(nurseServiceRoutes, { prefix: `${apiPrefix}/nurse-service` })
  await app.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` })
  await app.register(chatRoutes, { prefix: `${apiPrefix}/chat` })

  return app
}

export async function cleanupDatabase() {
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.chatRoom.deleteMany()
  await prisma.doctorPatientRequest.deleteMany()
  await prisma.doctorPatient.deleteMany()
  await prisma.nurseServiceRequest.deleteMany()
  await prisma.medicalRecord.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.nurse.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.admin.deleteMany()
  await prisma.user.deleteMany()
}

export async function createTestUser(role, email = null) {
  const userData = {
    email: email || `test${role.toLowerCase()}@test.com`,
    password: 'testpassword',
    role: role
  }

  const user = await prisma.user.create({ data: userData })

  let roleData
  switch (role) {
    case 'DOCTOR':
      roleData = await prisma.doctor.create({
        data: {
          name: 'Test Doctor',
          specialization: 'General',
          userId: user.id
        }
      })
      break
    case 'PATIENT':
      roleData = await prisma.patient.create({
        data: {
          name: 'Test Patient',
          location: 'Test Location',
          contactInfo: '+1234567890',
          userId: user.id
        }
      })
      break
    case 'NURSE':
      roleData = await prisma.nurse.create({
        data: {
          name: 'Test Nurse',
          availability: true,
          rating: 4.5,
          userId: user.id
        }
      })
      break
    case 'ADMIN':
      roleData = await prisma.admin.create({
        data: {
          name: 'Test Admin',
          userId: user.id
        }
      })
      break
  }

  return { user, roleData }
}

export async function generateToken(app, user) {
  return app.jwt.sign({ 
    id: user.id,
    email: user.email,
    role: user.role
  })
}

export function createAuthHeader(token) {
  return { Authorization: `Bearer ${token}` }
}
