import { PharmacyMedicinesService } from "../services/pharmacy.medicine.service.js";

export async function pharmacyMedicinesRoutes(fastify, options) {
  fastify.addHook('preHandler', async (request, reply) => {
    request.pharmacyId = request.user?.pharmacy?.id || "your-pharmacy-id"; // Replace logic as needed
  });

  fastify.get('/pharmacy/medicines', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const pharmacyId = request.pharmacyId;
      if (!pharmacyId) {
        return reply.status(401).send({ error: 'Pharmacy ID missing' });
      }

      try {
        const pharmacy = await PharmacyMedicinesService.getMedicinesByPharmacy(pharmacyId);
        if (!pharmacy) {
          return reply.status(404).send({ error: 'Pharmacy not found' });
        }
        reply.send(pharmacy.medicines);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch medicines' });
      }
    }
  });

  fastify.post('/pharmacy/medicines', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const pharmacyId = request.pharmacyId;
      if (!pharmacyId) {
        return reply.status(401).send({ error: 'Pharmacy ID missing' });
      }

      const { name, description, stock, price } = request.body;

      if (!name || price === undefined) {
        return reply.status(400).send({ error: 'Name and price are required' });
      }

      try {
        const newMedicine = await PharmacyMedicinesService.createMedicine(pharmacyId, {
          name,
          description,
          stock,
          price,
        });
        reply.status(201).send(newMedicine);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to create medicine' });
      }
    }
  });
}