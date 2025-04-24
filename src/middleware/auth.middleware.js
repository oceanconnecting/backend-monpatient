import { PrismaClient } from '@prisma/client'

const defaultPrisma = new PrismaClient()

export function createAuthMiddleware(fastify, prismaClient = defaultPrisma) {
  return async function authenticate(request, reply) {
    try {
      const authHeader = request.headers.authorization
      
      // More specific error for missing authorization header
      if (!authHeader) {
        reply.code(401).send({ error: 'Authorization header missing' })
        return
      }
      
      // Validate header format
      if (!authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'Invalid authorization format' })
        return
      }
      
      const token = authHeader.replace('Bearer ', '')
      
      // Explicit empty token check
      if (!token || token.trim() === '') {
        reply.code(401).send({ error: 'Empty token provided' })
        return
      }
      
      // Token verification with try/catch for specific JWT errors
      let decoded
      try {
        decoded = await request.jwtVerify()
        
        if (!decoded.id) {
          reply.code(401).send({ error: 'Invalid token payload' })
          return
        }
      } catch (jwtError) {
        // Handle specific JWT errors
        if (jwtError.name === 'TokenExpiredError') {
          reply.code(401).send({ error: 'Token expired' })
        } else {
          reply.code(401).send({ error: 'Invalid token' })
        }
        return
      }
      
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
      
      // More robust role determination with priority hierarchy
      let role = 'USER'
      let roleDetails = null
      
      if (user.admin) {
        role = 'ADMIN'
        roleDetails = user.admin
      } else if (user.doctor) {
        role = 'DOCTOR'
        roleDetails = user.doctor
      } else if (user.nurse) {
        role = 'NURSE'
        roleDetails = user.nurse
      } else if (user.pharmacy) {
        role = 'PHARMACY'
        roleDetails = user.pharmacy
      } else if (user.patient) {
        role = 'PATIENT'
        roleDetails = user.patient
      }
      
      // Account status check
      if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
        reply.code(403).send({ 
          error: 'Account suspended', 
          message: `Your account is currently ${user.status.toLowerCase()}` 
        })
        return
      }
      
      // Attach the user info with cleaner structure
      request.user = {
        id: user.id,
        email: user.email,
        role: role,
        roleDetails: roleDetails,
        permissions: user.permissions || [],
        metadata: {
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
      
      // Optional: Add user info to logs
      request.log.info({ userId: user.id, role }, 'User authenticated')
      
    } catch (err) {
      // More informative error handling
      request.log.error({ err }, 'Authentication error')
      
      if (err.code === 'P2025') {
        // Prisma not found error
        reply.code(401).send({ error: 'User record not found' })
      } else if (err.code?.startsWith('P')) {
        // Other Prisma errors
        reply.code(500).send({ error: 'Database error during authentication' })
      } else {
        reply.code(401).send({ error: 'Authentication failed' })
      }
    }
  }
}

export function checkRole(roles) {
  return async (request, reply) => {
    // Check if authentication was performed
    if (!request.user) {
      reply.code(401).send({ error: 'Authentication required' })
      return
    }
    
    // Convert single role to array for consistent handling
    const requiredRoles = Array.isArray(roles) ? roles : [roles]
    
    if (!requiredRoles.includes(request.user.role)) {
      // Log access attempt
      request.log.warn({
        userId: request.user.id,
        userRole: request.user.role,
        requiredRoles
      }, 'Insufficient permissions')
      
      reply.code(403).send({ 
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${requiredRoles.join(', ')}`
      })
      return
    }
    
    // Role check passed
  }
}