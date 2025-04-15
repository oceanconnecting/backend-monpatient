import { checkRole } from "../../middleware/auth.middleware.js";
import { PharmacyService } from "../../services/pharmacies/pharmacies.service.js";

export async function pharmacyRoutes(fastify) {
  // Helper function to handle common try/catch pattern
  const handleRequest = async (reply, asyncFn) => {
    try {
      return await asyncFn();
    } catch (error) {
      reply.code(500).send({ error: error.message });
    }
  };

  fastify.get("/", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      return handleRequest(reply, async () => {
        return await PharmacyService.getAllPharmacies();
      });
    }
  });

  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      return handleRequest(reply, async () => {
        const id = request.params.id;
        const pharmacy = await PharmacyService.getPharmacyById(id);
        if (!pharmacy) {
          return reply.code(404).send({ error: 'Pharmacy not found' });
        }
        return pharmacy;
      });
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      return handleRequest(reply, async () => {
        return await PharmacyService.createPharmacy(request.body);
      });
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['PHARMACY'])],
    handler: async (request, reply) => {
      return handleRequest(reply, async () => {
        const id = request.params.id;
        return await PharmacyService.updatePharmacyById(id, request.body);
      });
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['PHARMACY'])],
    handler: async (request, reply) => {
      return handleRequest(reply, async () => {
        const id = request.params.id;
        return await PharmacyService.deletePharmacy(id);
      });
    }
  });
}