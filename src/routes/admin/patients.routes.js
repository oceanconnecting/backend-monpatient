
import { checkRole } from '../../middleware/auth.middleware.js';
import { PatientService } from '../../services/users/patients.service.js'
export async function patientRoutes(fastify) {
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const patients = await PatientService.getAllPatients();
        return patients;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.get('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        if (id) {
          return reply.code(400).send({ error: 'Invalid patient ID' });
        }
        const patient = await PatientService.getPatientById(id);
        return patient;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const patient = await PatientService.createPatient(request.body);
        return patient;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const updatedPatient = await PatientService.updatePatient(request.params.id, request.body);
        return updatedPatient;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const result = await PatientService.deletePatient(request.params.id);
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}
