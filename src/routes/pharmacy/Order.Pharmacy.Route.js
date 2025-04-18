// routes/pharmacyOrdersRoutes.js
import { processOrder, deliverOrder } from "../../services/pharmacies/Order.Pharmacy.Service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export default async function pharmacyOrdersRoutes(fastify, options) {
  // Shared handler for order status transitions
  const handleStatusTransition = async (request, reply, transitionFunction, successMessage) => {
    const { id } = request.params;

    try {
      const updatedOrder = await transitionFunction(fastify.prisma, id);
      return reply.code(200).send({
        message: successMessage,
        order: updatedOrder,
      });
    } catch (error) {
      if (error.message === 'NOT_FOUND') {
        return reply.code(404).send({ message: 'Order not found' });
      }
      if (error.message === 'INVALID_STATUS') {
        return reply.code(400).send({ message: 'Order cannot transition from current status' });
      }
      return reply.code(500).send({ message: 'Something went wrong' });
    }
  };

  // Transition from Pending → Processing
  fastify.post('/:id/process', async (request, reply) => {
    return handleStatusTransition(
      request, 
      reply, 
      processOrder, 
      'Order processing started'
    );
  });

  // Transition from Processing → Delivered
  fastify.post('/:id/deliver', async (request, reply) => {
    return handleStatusTransition(
      request, 
      reply, 
      deliverOrder, 
      'Order delivered successfully'
    );
  });
}