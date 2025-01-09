import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function createAuthMiddleware(fastify) {
  return async function authenticate(request, reply) {
    try {
      await request.jwtVerify()
      
      // Get full user data with role-specific information
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
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

      // Attach the full user object to the request
      request.user = user
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
