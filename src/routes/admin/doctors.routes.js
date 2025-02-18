import { DoctorService } from '../../services/users/doctor.service.js';
import { checkRole } from '../../middleware/auth.middleware.js';

export async function doctorRoutes(fastify) {
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const doctors = await DoctorService.getAllDoctors();
        return doctors;
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
    
        const doctor = await DoctorService.getDoctorById(id);
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const doctor = await DoctorService.createDoctor(request.body);
        return doctor;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const updatedDoctor = await DoctorService.updateUser(request.params.id, request.body);
        return updatedDoctor;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const result = await DoctorService.deleteUser(request.params.id);
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}
