import { PharmacyMedicinesService } from "../../services/pharmacies/pharmacy.medicine.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function pharmacyMedicinesRoutes(fastify, options) {
  // Get pharmacy's medicines with pagination and sorting
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          sortBy: { type: 'string', enum: ['name', 'price', 'category', 'manufacturer', 'createdAt'], default: 'name' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        // Check if pharmacy ID exists in the auth user
        if (!request.user?.pharmacy?.id) {
          return reply.status(400).send({ error: 'Pharmacy ID not found in user context' });
        }
        
        const { page, limit, sortBy, sortOrder } = request.query;
        
        const pharmacy = await PharmacyMedicinesService.getPharmacyMedicines(
          request.user.pharmacy.id,
          { page, limit, sortBy, sortOrder }
        );
        
        // Check if pharmacy exists
        if (!pharmacy) {
          return reply.status(404).send({ error: 'Pharmacy not found' });
        }
        
        reply.send(pharmacy);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch medicines', details: error.message });
      }
    }
  });

  // Get all medicines with filtering, pagination and sorting
  fastify.get('/all', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          sortBy: { type: 'string', enum: ['name', 'price', 'category', 'manufacturer', 'createdAt'], default: 'name' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          name: { type: 'string' },
          category: { type: 'string' },
          manufacturer: { type: 'string' },
          minPrice: { type: 'number', minimum: 0 },
          maxPrice: { type: 'number', minimum: 0 }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { page, limit, sortBy, sortOrder, name, category, manufacturer, minPrice, maxPrice } = request.query;
        
        const filter = {};
        if (name) filter.name = name;
        if (category) filter.category = category;
        if (manufacturer) filter.manufacturer = manufacturer;
        if (minPrice !== undefined) filter.minPrice = minPrice;
        if (maxPrice !== undefined) filter.maxPrice = maxPrice;
        
        const medicines = await PharmacyMedicinesService.getAllMedicines({
          page,
          limit,
          sortBy,
          sortOrder,
          filter
        });
        
        reply.send(medicines);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch all medicines', details: error.message });
      }
    }
  });

  // Search medicines by query term
  fastify.get('/search', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const { q, page, limit } = request.query;
        const results = await PharmacyMedicinesService.searchMedicines(q, { page, limit });
        reply.send(results);
      } catch (error) {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Search failed', details: error.message });
      }
    }
  });

  // Get medicine by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const medicine = await PharmacyMedicinesService.getMedicineById(id);
        reply.send(medicine);
      } catch (error) {
        if (error.message === 'Medicine not found') {
          return reply.status(404).send({ error: 'Medicine not found' });
        }
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to fetch medicine', details: error.message });
      }
    }
  });

  // Create new medicines
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
                name: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                dosage: { type: 'string' },
                manufacturer: { type: 'string' },
                category: { type: 'string' },
                sideEffects: { type: 'string' },
                instructions: { type: 'string' },
                price: { type: 'number', minimum: 0 }
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

  // Update medicine by ID
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    schema: {
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
          name: { type: 'string' },
          description: { type: 'string' },
          dosage: { type: 'string' },
          manufacturer: { type: 'string' },
          category: { type: 'string' },
          sideEffects: { type: 'string' },
          instructions: { type: 'string' },
          price: { type: 'number', minimum: 0 }
        },
        additionalProperties: false
      }
    },
    handler: async (request, reply) => {
      fastify.log.debug(`PUT /${request.params.id} route called by user ${request.user.id}`);
      const { id } = request.params;
      const medicine = request.body;
      
      if (Object.keys(medicine).length === 0) {
        fastify.log.warn('Empty medicine data received in PUT request');
        return reply.status(400).send({ error: 'Medicine update data is required' });
      }
      
      try {
        // Verify pharmacy ownership of medicine (optional security check)
        const pharmacyId = request.user?.pharmacy?.id;
        if (pharmacyId) {
          const existingMedicine = await PharmacyMedicinesService.getMedicineById(id);
          if (existingMedicine.pharmacyId !== pharmacyId) {
            return reply.status(403).send({ error: 'You do not have permission to update this medicine' });
          }
        }
        
        fastify.log.debug(`Attempting to update medicine ${id}`);
        const updatedMedicine = await PharmacyMedicinesService.updateMedicine(id, medicine);
        fastify.log.debug(`Successfully updated medicine ${id}`);
        reply.send(updatedMedicine);
      } catch (error) {
        if (error.message === 'Medicine not found') {
          return reply.status(404).send({ error: 'Medicine not found' });
        }
        fastify.log.error(`Failed to update medicine ${id}:`, error);
        reply.status(500).send({ error: 'Failed to update medicine', details: error.message });
      }
    }
  });
  
  // Delete medicine by ID
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      fastify.log.debug(`DELETE /${request.params.id} route called by user ${request.user.id}`);
      const { id } = request.params;
      
      try {
        // Verify pharmacy ownership of medicine (optional security check)
        const pharmacyId = request.user?.pharmacy?.id;
        if (pharmacyId) {
          const existingMedicine = await PharmacyMedicinesService.getMedicineById(id);
          if (existingMedicine.pharmacyId !== pharmacyId) {
            return reply.status(403).send({ error: 'You do not have permission to delete this medicine' });
          }
        }
        
        fastify.log.debug(`Attempting to delete medicine ${id}`);
        await PharmacyMedicinesService.deleteMedicine(id);
        fastify.log.debug(`Successfully deleted medicine ${id}`);
        reply.send({ message: 'Medicine deleted successfully' });
      } catch (error) {
        if (error.message === 'Medicine not found') {
          return reply.status(404).send({ error: 'Medicine not found' });
        }
        fastify.log.error(`Failed to delete medicine ${id}:`, error);
        reply.status(500).send({ error: 'Failed to delete medicine', details: error.message });
      }
    }
  });
}