import { NurseServiceService } from '../services/relationships/nurse-service.service.js'
import { checkRole } from '../middleware/auth.middleware.js'

export async function nurseServiceRoutes(fastify) {
  // Patient creates a service request
  fastify.post('/request', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    schema: {
      body: {
        type: 'object',
        required: ['nurseId','serviceType', 'description', 'preferredDate', 'urgency', 'location'],
        properties: {
          nurseId: { type: 'string' },
          serviceType: { type: 'string' },
          description: { type: 'string' },
          preferredDate: { type: 'string', format: 'date-time' },
          urgency: { type: 'string', enum: ['Low', 'Medium', 'High'] },
          location: { type: 'string' },
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.createServiceRequest(
          request.user.patient.id,
          request.body,
          reply // Pass the reply object to the service function
        );
        
        // If the function returned normally (no error or early reply)
        if (result) {
          return result;
        }


        // If we get here without a result, it means reply was already sent
        
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }
  });
  // Nurse views available service requests
  fastify.get('/available', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    handler: async (request, reply) => {
      try {
        const requests = await NurseServiceService.getAvailableRequests()
        return requests
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Nurse accepts a service request
  fastify.put('/accept/:requestId', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: {
          requestId: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.acceptRequest(
          request.params.requestId,
          request.user.nurse.id
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Nurse updates service status
  fastify.put('/status/:requestId', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: {
          requestId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { 
            type: 'string', 
            enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] 
          },
          notes: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.updateRequestStatus(
          request.params.requestId,
          request.user.nurse.id,
          request.body.status,
          request.body.notes
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Patient rates completed service
  fastify.put('/rate/:requestId', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: {
          requestId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['rating'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          feedback: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.rateService(
          request.params.requestId,
          request.user.patient.id,
          request.body.rating,
          request.body.feedback
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Patient views their service requests 
  fastify.get('/patient/requests', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    handler: async (request, reply) => {
      try {
        const requests = await NurseServiceService.getPatientRequests(
          request.user.patient.id
        )
        return requests
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Nurse views their service requests
  fastify.get('/requests', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    handler: async (request, reply) => {
      try {
        const requests = await NurseServiceService.getNurseRequests(
          request.user.nurse.id
        )
        return requests
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Nurse views their patients
  fastify.get('/patients', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    handler: async (request, reply) => {
    try {
      const patients = await NurseServiceService.nursePatients(request.user.nurse.id)
      return patients
    } catch (error) {
      reply.code(400).send({ error: error.message })
    }
  }
  })
  
  // Patient cancels their service request
  fastify.put('/cancel/:requestId', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: {
          requestId: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.cancelRequest(
          request.params.requestId,
          request.user.patient.id
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  // Nurse searches for a patient
  fastify.get('/patient/search', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Patient name (first or last name)',
            minLength: 0,
            maxLength: 100,
            pattern: '^[a-zA-Z -]*$' // Only allow letters, spaces and hyphens
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number for pagination'
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Number of records per page'
          },
          sortBy: {
            type: 'string',
            enum: ['name', 'createdAt', 'status'],
            default: 'name',
            description: 'Field to sort by'
          },
          sortOrder: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'asc',
            description: 'Sort order'
          }
        },
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  gender: { type: 'string' },
                  address: { type: 'string', nullable: true },
                  profilePhoto: { type: 'string', nullable: true },
                  telephoneNumber: { type: 'string', nullable: true },
                  dateOfBirth: { type: 'string', format: 'date-time', nullable: true },
                  bloodType: { type: 'string', nullable: true },
                  allergies: { type: 'string', nullable: true },
                  chronicDiseases: { type: 'string', nullable: true },
                  role: { type: 'string' },
                  serviceRequestId: { type: 'string' },
                  serviceType: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  preferredDate: { type: 'string', format: 'date-time', nullable: true }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { name = '', page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = request.query;
        const nurseId = request.user.nurse.id;
        
        const result = await NurseServiceService.searchPatient(
          nurseId, 
          name.trim(),
          page,
          limit,
          sortBy,
          sortOrder
        );
        
        return result;
      } catch (error) {
        request.log.error('Patient search failed:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          reply.code(400).send({ error: 'Database error occurred' });
        } else {
          reply.code(500).send({ error: 'Internal server error' });
        }
      }
    }
  });
  // Nurse views their requests
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['NURSE'])],
    handler: async (request, reply) => {
      try {
        const requests = await NurseServiceService.getRequests(request.user.nurse.id) 
        return requests
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
}
