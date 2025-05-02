// location.routes.js
import { LocationService } from './../services/location.service.js';
import { checkRole } from '../middleware/auth.middleware.js';

async function locationRoutes(fastify, options) {
  // Schema definitions for reuse
  const locationParamsSchema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' }
    }
  };

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

  // ===== PATIENT LOCATION ROUTES =====
  
  // Create patient location
  fastify.post('/patients', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.createPatientLocation(request.user.patient.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to create patient location');
      }
    }
  });

  // Get patient location
  fastify.get('/patients', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
       const  patientId = request.user.patient.id;
        const location = await LocationService.getPatientLocation(patientId);
        
        if (!location) {
          return reply.code(404).send({ error: 'Patient location not found' });
        }
        
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to get patient location');
      }
    }
  });

  // Update patient location
  fastify.put('/patients', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
     
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const patientId = request.user.patient.id;
        const location = await LocationService.updatePatientLocation(patientId, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to update patient location');
      }
    }
  });

  // Delete patient location
  fastify.delete('/patients', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    
    handler: async (request, reply) => {
      try {
        const patientId = request.user.patient.id;
        
        // Delete the location and get the result message
        const result = await LocationService.deletePatientLocation(patientId);
        
        if (result.success) {
          // Success case - return 200 with message
          return reply.code(200).send({
            message: result.message
          });
        } else {
          // Location not found case - return 404
          return reply.code(404).send({
            error: result.message
          });
        }
      } catch (error) {
        // Handle other unexpected errors
        return handleError(request, reply, error, 'Failed to delete patient location');
      }
    }
  });

  // ===== NURSE LOCATION ROUTES =====
  
  // Create nurse location
  fastify.post('/nurses', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.createNurseLocation(request.user.nurse.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to create nurse location');
      }
    }
  });

  // Get nurse location
  fastify.get('/nurses', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const nurseId = request.user.nurse.id;
        const location = await LocationService.getNurseLocation(nurseId);
        
        if (!location) {
          return reply.code(404).send({ error: 'Nurse location not found' });
        }
        
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to get nurse location');
      }
    }
  });

  // Update nurse location
  fastify.put('/nurses', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
 
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.updateNurseLocation(request.user.nurse.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to update nurse location');
      }
    }
  });

  // Delete nurse location
  fastify.delete('/nurses', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    
    handler: async (request, reply) => {
      try {
        const nurseId = request.user.nurse.id; // Assuming nurse ID is in auth token
        
        const result = await LocationService.deleteNurseLocation(nurseId);
        
        if (result.success) {
          return reply.code(200).send({
            message: result.message
          });
          // Or for no content:
          // return reply.code(204).send();
        } else {
          return reply.code(404).send({
            error: result.message
          });
        }
      } catch (error) {
        return handleError(request, reply, error, 'Failed to delete nurse location');
      }
    }
  });

  // ===== DOCTOR LOCATION ROUTES =====
  
  // Create doctor location
  fastify.post('/doctors', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.createDoctorLocation(request.user.doctor.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to create doctor location');
      }
    }
  });

  // Get doctor location
  fastify.get('/doctors', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        
        const location = await LocationService.getDoctorLocation(request.user.doctor.id);
        
        if (!location) {
          return reply.code(404).send({ error: 'Doctor location not found' });
        }
        
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to get doctor location');
      }
    }
  });

  // Update doctor location
  fastify.put('/doctors', {
    onRequest: [checkRole('doctor')],
    schema: {
      params: locationParamsSchema,
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const  id  = request.user.doctor.id;
        const location = await LocationService.updateDoctorLocation(id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to update doctor location');
      }
    }
  });

  // Delete doctor location
  fastify.delete('/doctors', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        
        await LocationService.deleteDoctorLocation(request.user.doctor.id);
        return reply.code(204).send();
      } catch (error) {
        return handleError(request, reply, error, 'Failed to delete doctor location');
      }
    }
  });

  // ===== PHARMACY LOCATION ROUTES =====
  
  // Create pharmacy location
  fastify.post('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(["PHARMACY"])],
    schema: {
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.createPharmacyLocation(request.user.pharmacy.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to create pharmacy location');
      }
    }
  });

  // Get pharmacy location
  fastify.get('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(["PHARMACY"])],
    schema: {
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const location = await LocationService.getPharmacyLocation(request.user.pharmacy.id);
        
        if (!location) {
          return reply.code(404).send({ error: 'Pharmacy location not found' });
        }
        
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to get pharmacy location');
      }
    }
  });

  // Update pharmacy location
  fastify.put('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(["PHARMACY"])],
    schema: {
      body: locationBodySchema,
      response: {
        200: locationResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        
        const location = await LocationService.updatePharmacyLocation(request.user.pharmacy.id, request.body);
        return reply.code(200).send(location);
      } catch (error) {
        return handleError(request, reply, error, 'Failed to update pharmacy location');
      }
    }
  });

  // Delete pharmacy location
  fastify.delete('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(["PHARMACY"])],
    handler: async (request, reply) => {
      try {
        await LocationService.deletePharmacyLocation(request.user.pharmacy.id);
        return reply.code(204).send();
      } catch (error) {
        return handleError(request, reply, error, 'Failed to delete pharmacy location');
      }
    }
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

  // Approve location (could be an admin or verification feature)
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