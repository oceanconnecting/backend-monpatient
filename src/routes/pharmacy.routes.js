import { checkRole } from "../middleware/auth.middleware.js";
import { PharmacyService } from "../services/pharmacies/pharmacies.service.js";

export async function pharmacyRoutes(fastify) {
  fastify.get("/", {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const pharmacies = await PharmacyService.getAllPharmacies();
        return pharmacies;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.get("/medicine",{
  preHandler: fastify.authenticate,
  handler: async (request, reply) => {
    try {
      const pharmacies = await PharmacyService.pharcygetMedicine(request.user.pharmacy.id);
      return pharmacies;
    } catch (error) {
      reply.code(500).send({ error: error.message });
    }
  }
  })
  
  fastify.get('/:id', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const pharmacy = await PharmacyService.getPharmacyById(id);
        if (!pharmacy) {
          return reply.code(404).send({ error: 'Pharmacy not found' });
        }
        return pharmacy;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['PHARMACY'])],
    handler: async (request, reply) => {
      try {
        const pharmacy = await PharmacyService.createPharmacy(request.body);
        return pharmacy;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['PHARMACY'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const pharmacy = await PharmacyService.updatePharmacyById(id, request.body);
        return pharmacy;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['PHARMACY'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const pharmacy = await PharmacyService.deletePharmacy(id);
        return pharmacy;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });
}

