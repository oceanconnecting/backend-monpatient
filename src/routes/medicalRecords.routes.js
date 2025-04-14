import { MedicalRecordService } from '../services/medicalRecords.service.js';
import { checkRole } from '../middleware/auth.middleware.js';

export async function medicalRecordsRoutes(fastify, options) {
  // Get all medical records for a specific patient (Only the patient can view their own records)
  fastify.get('/:patientId', { onRequest: [fastify.authenticate, checkRole(["PATIENT","DOCTOR","NURSE"])],}, async (request, reply) => {
    try {
      const records = await MedicalRecordService.getMedicalRecordsByPatient(request.params.patientId);
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch records' });
    }
  });
// Medical Record Schemas
  const medicalRecordSchemas = {
    createMedicalRecord: {
      body: {
        type: 'object',
        required: ['patientId', 'diagnosis', 'treatment'],
        properties: {
          patientId: { type: 'string' },
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          notes: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            patientId: { type: 'string' },
            diagnosis: { type: 'string' },
            treatment: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
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
  
    updateMedicalRecord: {
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
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          notes: { type: 'string' }
        },
        minProperties: 1 // At least one field to update
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            patientId: { type: 'string' },
            diagnosis: { type: 'string' },
            treatment: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  };
  // Create a new medical record (Only doctors and nu can create medical records)
  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR", "NURSE"])],
    schema: medicalRecordSchemas.createMedicalRecord
  }, async (request, reply) => {
    try {
      // Pass the authenticated user's ID to the service
      const record = await MedicalRecordService.createMedicalRecord(
        request.body, 
        request.user.id // Assuming your authentication middleware adds user to request
      );
      reply.status(201).send(record);
    } catch (error) {
      if (error.message.includes("authorized")) {
        reply.status(403).send({ error: error.message });
      } else {
        reply.status(500).send({ error: error.message || 'Failed to create record' });
      }
    }
  });
  // Update a medical record (Only nurses and doctors can update records)
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(["NURSE", "DOCTOR"])],
    schema: medicalRecordSchemas.updateMedicalRecord
  }, async (request, reply) => {
    try {
      const updatedRecord = await MedicalRecordService.updateMedicalRecord(
        request.params.id, 
        request.body
      );
      reply.send(updatedRecord);
    } catch (error) {
      reply.status(500).send({ error: 'Failed to update record' });
    }
  });
  // Delete a medical record (Only doctors can delete records)
  fastify.delete('/:id', { 
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])]
  }, async (request, reply) => {
    try {
      await MedicalRecordService.deleteMedicalRecord(request.params.id);
      reply.send({ message: 'Record deleted' });
    } catch (error) {
      reply.status(500).send({ error: 'Failed to delete record' });
    }
  });
}
