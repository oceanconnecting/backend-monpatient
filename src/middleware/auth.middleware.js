import { PrismaClient } from '@prisma/client'

const defaultPrisma = new PrismaClient()

export function createAuthMiddleware(fastify, prismaClient = defaultPrisma) {
  return async function authenticate(request, reply) {
    try {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'No token provided' })
        return
      }

      const token = authHeader.replace('Bearer ', '')
      
      if (!token) {
        reply.code(401).send({ error: 'No token provided' })
        return
      }

      const decoded = await request.jwtVerify()
      
      // Get full user data with role-specific information
      const user = await prismaClient.user.findUnique({
        where: { id: decoded.id },
        include: {
          patient: true,
          doctor: true,
          nurse: true,
          pharmacy: true,
          admin: true
        }
      })

      if (!user) {
        reply.code(401).send({ error: 'User not found' })
        return
      }

      // Determine user role
      let role = 'USER'
      if (user.admin) role = 'ADMIN'
      else if (user.doctor) role = 'DOCTOR'
      else if (user.nurse) role = 'NURSE'
      else if (user.pharmacy) role = 'PHARMACY'
      else if (user.patient) role = 'PATIENT'

      // Attach the user info to the request
      request.user = {
        id: user.id,
        role: role,
        ...user
      }
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  }
}

export function checkRole(roles) {
  return async (request, reply) => {
    if (!request.user) {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }

    if (!roles.includes(request.user.role)) {
      reply.code(403).send({ error: 'Forbidden' })
      return
    }
  }
}
