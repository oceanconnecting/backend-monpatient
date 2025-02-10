import { AdminService } from '../../services/admin.service.js';
import { checkRole } from '../../middleware/auth.middleware.js';

export async function userRoutes(fastify) {
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const users = await AdminService.getAllUsers();
        return users;
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
        const user = await AdminService.getUserById(id);
        if (!user) {
          return reply.code(404).send({ error: 'User not found' });
        }
        return user;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const user = await AdminService.createUser(request.body);
        return user;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const updatedUser = await AdminService.updateUser(request.params.id, request.body);
        return updatedUser;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const result = await AdminService.deleteUser(request.params.id);
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });
}