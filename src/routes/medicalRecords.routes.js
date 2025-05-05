import { MedicalRecordService } from '../services/medicalRecords.service.js';
import { checkRole } from '../middleware/auth.middleware.js';

export async function medicalRecordsRoutes(fastify) {
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
       
          recordDate: { type: 'string', format: 'date-time' }
        },
        minProperties: 1
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
    searchMedicalRecords: {
      querystring: {
        type: 'object',
        properties: {
          searchTerm: { type: 'string' },
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 }
        },
        required: ['searchTerm']
      }
    },
    dateRangeQuery: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 }
        },
        required: ['startDate', 'endDate']
      }
    }
  };

  // Get all medical records (Admin only)
  fastify.get('/', { 
    onRequest: [fastify.authenticate, checkRole(["ADMIN"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { skip = 0, take = 10 } = request.query;
      const records = await MedicalRecordService.findMany({}, { skip, take });
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
  fastify.get('/patient', { 
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
     
      const records = await MedicalRecordService.findByAuthenticatedPatient(request, { 
        skip: 0, 
        take: 10 
      });;
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get medical record by ID
  fastify.get('/:id', { 
    onRequest: [fastify.authenticate, checkRole(["PATIENT", "DOCTOR", "ADMIN"])] 
  }, async (request, reply) => {
    try {
      const record = await MedicalRecordService.findById(request.params.id);
      if (!record) {
        return reply.status(404).send({ error: 'Medical record not found' });
      }
      reply.send(record);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get medical records for a specific patient
  fastify.get('/patient/:patientId', { 
    onRequest: [fastify.authenticate, checkRole(["PATIENT", "DOCTOR", "ADMIN"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          skip: { type: 'number', default: 0 },
          take: { type: 'number', default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { skip = 0, take = 10 } = request.query;
      const records = await MedicalRecordService.findByPatientId(request.params.patientId, { skip, take });
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get medical records for a specific doctor

  // Search medical records
  fastify.get('/search', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR", "ADMIN"])],
    schema: medicalRecordSchemas.searchMedicalRecords
  }, async (request, reply) => {
    try {
      const { searchTerm, skip = 0, take = 10 } = request.query;
      const records = await MedicalRecordService.search(searchTerm, { skip, take });
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Get medical records by date range
  fastify.get('/date-range', { 
    onRequest: [fastify.authenticate, checkRole(["DOCTOR", "ADMIN"])],
    schema: medicalRecordSchemas.dateRangeQuery
  }, async (request, reply) => {
    try {
      const { startDate, endDate, skip = 0, take = 10 } = request.query;
      const records = await MedicalRecordService.findByDateRange(
        new Date(startDate), 
        new Date(endDate), 
        { skip, take }
      );
      reply.send(records);
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });

  // Create a new medical record
  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: medicalRecordSchemas.createMedicalRecord
  }, async (request, reply) => {
    try {
      const userId = request.user.id;
      const userRole = request.user.role;
      
      const recordData = { ...request.body };
      
      // Automatically assign the creator as doctor  if not specified
      if (userRole === "DOCTOR" && !recordData.doctorId) {
         recordData.doctorId = userId;
      }
      
      const record = await MedicalRecordService.create(recordData,request);
      reply.status(201).send(record);
    } catch (error) {
      if (error.message.includes('Failed to create')) {
        reply.status(400).send({ error: error.message });
      } else {
        reply.status(500).send({ error: error.message || 'Failed to create record' });
      }
    }
  });

  // Update a medical record
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: medicalRecordSchemas.updateMedicalRecord
  }, async (request, reply) => {
    try {
      const updatedRecord = await MedicalRecordService.update(
        request.params.id, 
        request.body
      );
      reply.send(updatedRecord);
    } catch (error) {
      if (error.message.includes('Failed to update')) {
        reply.status(400).send({ error: error.message });
      } else {
        reply.status(500).send({ error: error.message || 'Failed to update record' });
      }
    }
  });

  // Delete a medical record
  fastify.delete('/:id', { 
    onRequest: [fastify.authenticate, checkRole(["DOCTOR", "ADMIN"])]
  }, async (request, reply) => {
    try {
      const deletedRecord = await MedicalRecordService.delete(request.params.id);
      reply.send(deletedRecord);
    } catch (error) {
      reply.status(500).send({ error: error.message || 'Failed to delete record' });
    }
  });

  // Count medical records (Admin only)
  fastify.get('/count', { 
    onRequest: [fastify.authenticate, checkRole(["ADMIN"])]
  }, async (request, reply) => {
    try {
      const count = await MedicalRecordService.count();
      reply.send({ count });
    } catch (error) {
      reply.status(500).send({ error: error.message });
    }
  });
 
}