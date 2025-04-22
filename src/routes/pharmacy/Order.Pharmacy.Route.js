// routes/pharmacyOrdersRoutes.js
import { PharmacyService } from "../../services/pharmacies/pharmacies.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export default async function pharmacyOrdersRoutes(fastify, options) {
  // Shared handler for order status transitions

  // Transition from Pending → Processing
  fastify.get('/:id/process', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
  }, async (request, reply) => {
    return (
      request,
      reply,
      PharmacyService.makeprocessOrder(request.params.id)
    );
  });
  fastify.get('/', {
   
    handler: async (request, reply) => {
      try {
        const orders = await PharmacyService.getAllorders();
        
        return reply.code(200).send({
          success: true,
          data: orders
        });
      } catch (error) {
        fastify.log.error(`Error fetching pharmacy orders: ${error.message}`);
        return reply.code(500).send({
          success: false,
          error: 'Failed to retrieve orders'
        });
      }
    }
  });
  // Transition from Processing → Delivered
  fastify.post('/:id/deliver', {
    onRequest: [fastify.authenticate, checkRole('PHARMACY')],
  }, async (request, reply) => {
    return (
      request,
      reply,
      PharmacyService.makedelivrie,
      'Order delivered successfully'
    );
  });
}