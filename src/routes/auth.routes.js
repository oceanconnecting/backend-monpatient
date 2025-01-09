import { AuthService } from '../services/auth.service.js'

export async function authRoutes(fastify) {
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          role: { type: 'string', enum: ['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'] },
          location: { type: 'string' },
          contactInfo: { type: 'string' },
          specialization: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const user = await AuthService.register(request.body)
        const token = fastify.jwt.sign({ 
          id: user.id, 
          email: user.email, 
          role: user.role 
        })
        
        return { user, token }
      } catch (error) {
        fastify.log.error(error)
        reply.code(400).send({ 
          error: 'Registration failed',
          message: error.message 
        })
      }
    },
  })

  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { email, password } = request.body
        const user = await AuthService.login(email, password)
        const token = fastify.jwt.sign({ 
          id: user.id, 
          email: user.email, 
          role: user.role 
        })
        
        return { user, token }
      } catch (error) {
        fastify.log.error(error)
        reply.code(401).send({ 
          error: 'Authentication failed',
          message: error.message 
        })
      }
    },
  })

  // Protected route example
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user.id },
          include: {
            patient: true,
            nurse: true,
            doctor: true,
            pharmacy: true,
            admin: true,
          },
        })
        if (!user) {
          reply.code(404).send({ error: 'User not found' })
          return
        }
        const { password, ...userWithoutPassword } = user
        return userWithoutPassword
      } catch (error) {
        fastify.log.error(error)
        reply.code(500).send({ 
          error: 'Internal server error',
          message: error.message 
        })
      }
    },
  })
}
