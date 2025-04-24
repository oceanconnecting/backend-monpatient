import { MedicalRecordService } from '../services/medicalRecords.service.js';
import { checkRole } from '../middleware/auth.middleware.js';

export async function medicalRecordsRoutes(fastify, options) {
  // Get all medical records for a specific patient
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
          notes: { type: 'string' },
          doctorId: { type: 'string' },
          nurseId: { type: 'string' },
          recordDate: { type: 'string', format: 'date-time' }
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
            doctorId: { type: 'string' },
            nurseId: { type: 'string' },
            recordDate: { type: 'string', format: 'date-time' },
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
          notes: { type: 'string' },
          doctorId: { type: 'string' },
          nurseId: { type: 'string' },
          recordDate: { type: 'string', format: 'date-time' }
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
            doctorId: { type: 'string' },
            nurseId: { type: 'string' },
            recordDate: { type: 'string', format: 'date-time' },
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
  
  // Create a new medical record (Only doctors and nurses can create medical records)
  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR", "NURSE"])],
    schema: medicalRecordSchemas.createMedicalRecord
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const userRole = request.user.role;
      
      // Create a new copy of the request body to avoid mutation
      const recordData = { ...request.body };
      
      // Only include doctorId or nurseId if they actually exist in the database
      // Let the service handle validation of these IDs
      if (userRole === "DOCTOR") {
        recordData.doctorId = userId;
        // If nurseId is empty or undefined, remove it to prevent connection errors
        if (!recordData.nurseId) {
          delete recordData.nurseId;
        }
      } else if (userRole === "NURSE") {
        recordData.nurseId = userId;
        // If doctorId is empty or undefined, remove it to prevent connection errors
        if (!recordData.doctorId) {
          delete recordData.doctorId;
        }
      }
      
      const record = await MedicalRecordService.createMedicalRecord(
        recordData,
        userId,
        userRole
      );
      
      reply.status(201).send(record);
    } catch (error) {
      console.error("Error creating medical record:", error);
      
      if (error.code === 'P2025') {
        reply.status(400).send({ 
          error: 'Invalid reference: One or more referenced records do not exist' 
        });
      } else if (error.message.includes("authorized")) {
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
      // Remove empty/undefined IDs to prevent connection errors
      const updateData = { ...request.body };
      if (!updateData.doctorId) delete updateData.doctorId;
      if (!updateData.nurseId) delete updateData.nurseId;
      
      const updatedRecord = await MedicalRecordService.updateMedicalRecord(
        request.params.id, 
        updateData
      );
      reply.send(updatedRecord);
    } catch (error) {
      console.error("Error updating medical record:", error);
      
      if (error.code === 'P2025') {
        reply.status(404).send({ error: 'Medical record or referenced entity not found' });
      } else {
        reply.status(500).send({ error: error.message || 'Failed to update record' });
      }
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
      console.error("Error deleting medical record:", error);
      
      if (error.code === 'P2025') {
        reply.status(404).send({ error: 'Medical record not found' });
      } else {
        reply.status(500).send({ error: error.message || 'Failed to delete record' });
      }
    }
  });
}