import { checkRole } from "../middleware/auth.middleware.js";
import { PrescriptionService } from "../services/prescription.service.js";
import { createNotification } from "../middleware/notification.middleware.js";
export async function prescriptionRoutes(fastify) {
  // Get all prescriptions
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY'])],
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
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
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.getPrescriptionById(request.params.id);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  fastify.get("/doctor", {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    config: {
      cache: {
        expiresIn: 3000
      }
    },
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.doctorgethisprescription(request?.user?.doctor.id)
        return prescription
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message })
      }
    }
  })

  // Create new prescription
  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole("DOCTOR")],
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
        // Get the prescription created by service
        const prescription = await PrescriptionService.createPrescription(
          request?.user?.doctor?.id,
          request.body,
          fastify
        );
try {
  await createNotification(
    {
      type: 'PRESCRIPTION_CREATED',
      title: 'New Prescription',
      message: `You have a new prescription from Dr. ${request.user.doctor.name}`,
      metadata: {
        prescriptionId: prescription.id
      }
    },
      prescription.patient.user.id, 
    { fastify }
  );
} catch (notificationError) {
  // Log but don't fail the prescription creation
  fastify.log.error('Failed to send notification:', notificationError);
}
        // Send WebSocket notifications

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
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY', 'PATIENT'])],
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
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

// Helper function to send prescription notifications
// In your prescriptionRoutes.js
