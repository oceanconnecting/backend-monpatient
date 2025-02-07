import { NurseService } from '../../services/nurse.service.js';
import { checkRole } from '../../middleware/auth.middleware.js';

export async function nurseRoutes(fastify) {
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const nurses = await NurseService.getAllNurses();
        return nurses;
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
        if (isNaN(id)) {
          return reply.code(400).send({ error: 'Invalid nurse ID' });
        }
        const nurse = await NurseService.getNurseById(id);
        return nurse;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const nurse = await NurseService.createNurse(request.body);
        return nurse;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const updatedNurse = await NurseService.updateNurse(request.params.id, request.body);
        return updatedNurse;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const result = await NurseService.deleteNurse(request.params.id);
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}
