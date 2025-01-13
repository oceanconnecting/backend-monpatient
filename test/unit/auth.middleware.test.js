import { expect } from 'chai'
import { createAuthMiddleware } from '../../src/middleware/auth.middleware.js'

describe('Auth Middleware', () => {
  const mockUser = {
    id: 1,
    email: 'admin@test.com',
    admin: { id: 1 }
  }

  const mockPrisma = {
    user: {
      findUnique: async ({ where }) => {
        if (where.id === 1) {
          return mockUser
        }
        return null
      }
    }
  }

  const mockApp = {
    jwt: {
      verify: async (token) => {
        if (token === 'valid-token') {
          return { id: 1, role: 'ADMIN' }
        }
        throw new Error('Invalid token')
      }
    },
    log: {
      error: () => {}
    }
  }

  const middleware = createAuthMiddleware(mockApp, mockPrisma)

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const request = {
        headers: {
          authorization: 'Bearer valid-token'
        },
        jwtVerify: async () => ({ id: 1 })
      }
      const reply = {
        code: (code) => {
          reply.statusCode = code
          return reply
        },
        send: (payload) => {
          reply.payload = payload
          return reply
        }
      }

      await middleware(request, reply)
      expect(request.user).to.deep.equal({
        id: 1,
        role: 'ADMIN',
        ...mockUser
      })
    })

    it('should reject missing token', async () => {
      const request = {
        headers: {}
      }
      const reply = {
        code: (code) => {
          reply.statusCode = code
          return reply
        },
        send: (payload) => {
          reply.payload = payload
          return reply
        }
      }

      await middleware(request, reply)
      expect(reply.statusCode).to.equal(401)
      expect(reply.payload).to.deep.equal({ error: 'No token provided' })
    })

    it('should reject invalid token', async () => {
      const request = {
        headers: {
          authorization: 'Bearer invalid-token'
        },
        jwtVerify: async () => {
          throw new Error('Invalid token')
        }
      }
      const reply = {
        code: (code) => {
          reply.statusCode = code
          return reply
        },
        send: (payload) => {
          reply.payload = payload
          return reply
        }
      }

      await middleware(request, reply)
      expect(reply.statusCode).to.equal(401)
      expect(reply.payload).to.deep.equal({ error: 'Unauthorized' })
    })

    it('should reject malformed authorization header', async () => {
      const request = {
        headers: {
          authorization: 'invalid-format'
        }
      }
      const reply = {
        code: (code) => {
          reply.statusCode = code
          return reply
        },
        send: (payload) => {
          reply.payload = payload
          return reply
        }
      }

      await middleware(request, reply)
      expect(reply.statusCode).to.equal(401)
      expect(reply.payload).to.deep.equal({ error: 'No token provided' })
    })
  })
})
