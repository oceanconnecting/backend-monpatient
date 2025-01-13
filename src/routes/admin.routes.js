import { AdminService } from '../services/admin.service.js'
import { checkRole } from '../middleware/auth.middleware.js'

export async function adminRoutes(fastify) {
  // Get all users
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string' },
              role: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const users = await AdminService.getAllUsers()
        return users
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  // Get user by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const user = await AdminService.getUserById(request.params.id)
        return user
      } catch (error) {
        reply.code(404).send({ error: error.message })
      }
    }
  })

  // Get all doctors
  fastify.get('/doctors', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const doctors = await AdminService.getAllDoctors()
        return doctors
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  // Get all nurses
  fastify.get('/nurses', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const nurses = await AdminService.getAllNurses()
        return nurses
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  // Get all patients
  fastify.get('/patients', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const patients = await AdminService.getAllPatients()
        return patients
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  // Update user
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          location: { type: 'string' },
          contactInfo: { type: 'string' },
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const updatedUser = await AdminService.updateUser(request.params.id, request.body)
        return updatedUser
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // Delete user
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await AdminService.deleteUser(request.params.id)
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
}
