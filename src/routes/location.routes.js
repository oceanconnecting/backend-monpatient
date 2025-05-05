// location.routes.js
import { LocationService } from './../services/location.service.js';
import { checkRole } from '../middleware/auth.middleware.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function locationRoutes(fastify) {
  // Schema definitions for reuse
  const locationBodySchema = {
    type: 'object',
    required: ['latitude', 'longitude'],
    properties: {
      latitude: { type: 'string' },
      longitude: { type: 'string' },
      address: { type: 'string' },
      details: { type: 'string' }
    }
  };

  const locationResponseSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      lat: { type: 'string' },
      long: { type: 'string' },
      address: { type: 'string' },
      details: { type: 'string' },
      date: { type: 'string', format: 'date-time' },
      approved: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      nurse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              firstname: { type: 'string' },
              lastname: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      }
    }
  };

  // Helper function for consistent error handling
  const handleError = (request, reply, error, message) => {
    request.log.error(error);
    return reply.code(500).send({ error: message });
  };

  // Define route types
  const userTypes = ['patients', 'nurses', 'doctors', 'pharmacies'];
  const roleMap = {
    'patients': 'PATIENT',
    'nurses': 'NURSE',
    'doctors': 'DOCTOR',
    'pharmacies': 'PHARMACY'
  };

  // Helper to get user ID based on role
  const getUserId = (request, userType) => {
    const singularType = userType.slice(0, -1); // Remove 's' to get singular
    return request.user[singularType].id;
  };

  // Register routes for each user type
  userTypes.forEach(userType => {
    const role = roleMap[userType];
    const singularType = userType.slice(0, -1); // Remove 's' to get singular form
    const serviceFunctionBase = singularType.charAt(0).toUpperCase() + singularType.slice(1);

    // Create location
    fastify.post(`/${userType}`, {
      onRequest: [fastify.authenticate, checkRole([role])],
      schema: {
        body: locationBodySchema,
        response: {
          200: locationResponseSchema
        }
      },
      handler: async (request, reply) => {
        try {
          const userId = getUserId(request, userType);
          const location = await LocationService[`create${serviceFunctionBase}Location`](userId, request.body);
          return reply.code(200).send(location);
        } catch (error) {
          return handleError(request, reply, error, `Failed to create ${singularType} location`);
        }
      }
    });

    // Get location
    fastify.get(`/${userType}`, {
      onRequest: [fastify.authenticate, checkRole([role])],
      schema: {
        response: {
          200: locationResponseSchema
        }
      },
      handler: async (request, reply) => {
        try {
          const userId = getUserId(request, userType);
          const location = await LocationService[`get${serviceFunctionBase}Location`](userId);
          
          if (!location) {
            return reply.code(404).send({ error: `${serviceFunctionBase} location not found` });
          }
          
          return reply.code(200).send(location);
        } catch (error) {
          return handleError(request, reply, error, `Failed to get ${singularType} location`);
        }
      }
    });

    // Update location
    fastify.put(`/${userType}`, {
      onRequest: [fastify.authenticate, checkRole([role])],
      schema: {
        body: locationBodySchema,
        response: {
          200: locationResponseSchema
        }
      },
      handler: async (request, reply) => {
        try {
          const userId = getUserId(request, userType);
          const location = await LocationService[`update${serviceFunctionBase}Location`](userId, request.body);
          return reply.code(200).send(location);
        } catch (error) {
          return handleError(request, reply, error, `Failed to update ${singularType} location`);
        }
      }
    });

    // Delete location
    fastify.delete(`/${userType}`, {
      onRequest: [fastify.authenticate, checkRole([role])],
      handler: async (request, reply) => {
        try {
          const userId = getUserId(request, userType);
          
          // Special handling for patient and nurse which return results
          if (userType === 'patients' || userType === 'nurses') {
            const result = await LocationService[`delete${serviceFunctionBase}Location`](userId);
            
            if (result.success) {
              return reply.code(200).send({ message: result.message });
            } else {
              return reply.code(404).send({ error: result.message });
            }
          } else {
            // Standard handling for doctor and pharmacy
            await LocationService[`delete${serviceFunctionBase}Location`](userId);
            return reply.code(204).send();
          }
        } catch (error) {
          return handleError(request, reply, error, `Failed to delete ${singularType} location`);
        }
      }
    });
  });

  // ===== PROXIMITY SEARCH ROUTES =====
  
  // Find locations by proximity
  fastify.get('/locations/proximity', {
    onRequest: [fastify.authenticate, checkRole(["PHARMACY","PATIENT","DOCTOR","NURSE"])],
    schema: {
      querystring: {
        type: 'object',
        required: ['latitude', 'longitude', 'radius'],
        properties: {
          latitude: { type: 'string' },
          longitude: { type: 'string' },
          radius: { type: 'number' },
          role: { type: 'string', enum: ['patient', 'nurse', 'doctor', 'pharmacy'] }
        }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ...locationResponseSchema.properties,
              distance: { type: 'number' }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { latitude, longitude, radius, role } = request.query;
        const locations = await LocationService.getLocationsByProximity(
          latitude, 
          longitude, 
          radius, 
          role
        );
        
        return reply.code(200).send(locations);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to find locations by proximity');
      }
    }
  });

  // Approve location (admin feature)
  fastify.patch('/locations/:id/approve', {
    onRequest: [checkRole('admin')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        
        const location = await prisma.location.update({
          where: { id },
          data: { approved: true }
        });
        
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to approve location');
      }
    }
  });
}

export default locationRoutes;