import { PharmacyMedicinesService } from "../../services/pharmacies/pharmacy.medicine.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function pharmacyMedicinesRoutes(fastify, options) {
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    handler: async (request, reply) => {
      try {
        // Check if pharmacy ID exists in the auth user
        if (!request.user || !request.user.pharmacy || !request.user.pharmacy.id) {
          return reply.status(400).send({ error: 'Pharmacy ID not found in user context' });
        }
        
        const pharmacy = await PharmacyMedicinesService.getPharmacyMedicines(request.user.pharmacy.id);
        
        // Check if pharmacy exists
        if (!pharmacy) {
          return reply.status(404).send({ error: 'Pharmacy not found' });
        }
        
        // Check if medicines array exists
        if (!pharmacy.medicines) {
          return reply.status(200).send({ ...pharmacy, medicines: [] });
        }
        
        reply.send(pharmacy);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch medicines' });
      }
    }
  });

  fastify.get('/all', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const medicines = await PharmacyMedicinesService.getAllMedicines();
        reply.send(medicines);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch all medicines' });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    schema: {
      body: {
        type: 'object',
        required: ['medicines'],
        properties: {
          medicines: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'price'],
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
        // Modified to handle the error in the route instead of passing reply to service
        const deletedMedicine = await PharmacyMedicinesService.deleteMedicine(id);
        fastify.log.debug(`Successfully deleted medicine ${id}`);
        reply.send({ message: 'Medicine deleted successfully' });
      } catch (error) {
        if (error.message === 'Medicine not found') {
          return reply.status(404).send({ error: 'Medicine not found' });
        }
        fastify.log.error(`Failed to delete medicine ${id}:`, error);
        reply.status(500).send({ error: 'Failed to delete medicine' });
      }
    }
  });
}