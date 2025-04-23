import { checkRole } from "../middleware/auth.middleware.js";
import { PrescriptionService } from "../services/prescription.service.js";

export async function prescriptionRoutes(fastify, options) {
  // Get all prescriptions
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY'])],
    handler: async (request, reply) => {
      try {
        const prescriptions = await PrescriptionService.getAllPrescriptions();
        return prescriptions;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Get prescription by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY'])],
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.getPrescriptionById(request.params.id);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Create new prescription
  fastify.post('/', {
    onRequest: [fastify.authenticate,checkRole("DOCTOR")],
    schema: {
      body: {
        type: 'object',
        required: ['patientId', 'details', 'items'],
        properties: {
          patientId: { type: 'string' },
          details: { type: 'string' },
          approved: { type: 'boolean' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'quantity'],
              properties: {
                name: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 },
            
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.createPrescription(request.user.doctor.id, request.body);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Update prescription
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.updatePrescription(request.params.id, request.body);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Delete prescription
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.deletePrescription(request.params.id);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Get prescriptions by patient ID
  fastify.get('/patient/:patientId', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY','PATIENT'])],
    handler: async (request, reply) => {
      try {
        const prescriptions = await PrescriptionService.getPrescriptionsByPatientId(request.params.patientId);
        return prescriptions;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });
}