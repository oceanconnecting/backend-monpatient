import { PharmacyMedicinesService } from "../../services/pharmacies/pharmacy.medicine.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";
export async function pharmacyMedicinesRoutes(fastify, options) {
  

  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    handler: async (request, reply) => {
      const pharmacyId = request.user?.pharmacy?.id;
      if (!pharmacyId) {
        return reply.status(401).send({ error: 'Pharmacy ID missing' });
      }

      try {
        const pharmacy = await PharmacyMedicinesService.getMedicinesByPharmacy(pharmacyId);
        if (!pharmacy) {
          return reply.status(404).send({ error: 'Pharmacy not found' });
        }
        reply.send(pharmacy);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch medicines' });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate],
    schema: {  // Recommended: Add input validation
      body: {
       type: 'object',
        required: ['medicines'],
        properties: {
          medicines: {
            type: 'array',
            items: {
             type: 'object',
              required: ['name', 'price'], // Add other required fields
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                dosage: { type: 'string' },
                manufacturer: { type: 'string' },
                category: { type: 'string' },
                sideEffects: { type: 'string' },
                instructions: { type: 'string' },
                price: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const pharmacyId = request.user?.pharmacy?.id;
      if (!pharmacyId) {
        return reply.status(401).send({ error: 'Pharmacy ID missing' });
      }
  
      const { medicines } = request.body;
  
      if (!medicines || !Array.isArray(medicines)) {
        return reply.status(400).send({ error: 'Medicines array is required' });
      }
  
      try {
        const result = await PharmacyMedicinesService.createMedicines(pharmacyId, medicines);
        reply.status(201).send({
          success: true,
          count: result.count,
          message: `Created ${result.count} medicines`
        });
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ 
          error: 'Failed to create medicines',
          details: error.message 
        });
      }
    }
  });
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    handler: async (request, reply) => {
      fastify.log.debug(`PUT /${request.params.id} route called by user ${request.user.id}`);
      const { id } = request.params;
      const medicine = request.body;
      
      fastify.log.debug(`Update request for medicine ID ${id} with data:`, medicine);
      
      if (!medicine) {
        fastify.log.warn('Empty medicine data received in PUT request');
        return reply.status(400).send({ error: 'Medicine is required' });
      }
      
      try {
        fastify.log.debug(`Attempting to update medicine ${id}`);
        const updatedMedicine = await PharmacyMedicinesService.updateMedicine(id, medicine);
        fastify.log.debug(`Successfully updated medicine ${id}:`, updatedMedicine);
        reply.send(updatedMedicine);
      } catch (error) {
        fastify.log.error(`Failed to update medicine ${id}:`, error);
        reply.status(500).send({ error: 'Failed to update medicine' });
      }
    }
  });
  
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    handler: async (request, reply) => {
      fastify.log.debug(`DELETE /${request.params.id} route called by user ${request.user.id}`);
      const { id } = request.params;
      
      try {
        fastify.log.debug(`Attempting to delete medicine ${id}`);
        await PharmacyMedicinesService.deleteMedicine(id, reply);
        fastify.log.debug(`Successfully deleted medicine ${id}`);
        reply.send({ message: 'Medicine deleted successfully' });
      } catch (error) {
        fastify.log.error(`Failed to delete medicine ${id}:`, error);
        reply.status(500).send({ error: 'Failed to delete medicine' });
      }
    }
  });
}