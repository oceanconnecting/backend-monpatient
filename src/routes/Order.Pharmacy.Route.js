// routes/pharmacyOrdersRoutes.js
import { processOrder, deliverOrder } from "../services/Order.Pharmacy.Service.js";

export default async function pharmacyOrdersRoutes(fastify, options) {
  // Transition from Pending → Processing
  fastify.post('/:id/process', async (request, reply) => {
    const { id } = request.params;

    try {
      const updatedOrder = await processOrder(fastify.prisma, id);
      return reply.code(200).send({
        message: 'Order processing started',
        order: updatedOrder,
      });
    } catch (error) {
      if (error.message === 'NOT_FOUND') {
        return reply.code(404).send({ message: 'Order not found' });
      }
      if (error.message === 'INVALID_STATUS') {
        return reply.code(400).send({ message: 'Order cannot be processed from current status' });
      }
      return reply.code(500).send({ message: 'Something went wrong' });
    }
  });

  // Transition from Processing → Delivered
  fastify.post('/:id/deliver', async (request, reply) => {
    const { id } = request.params;

    try {
      const updatedOrder = await deliverOrder(fastify.prisma, id);
      return reply.code(200).send({
        message: 'Order delivered successfully',
        order: updatedOrder,
      });
    } catch (error) {
      if (error.message === 'NOT_FOUND') {
        return reply.code(404).send({ message: 'Order not found' });
      }
      if (error.message === 'INVALID_STATUS') {
        return reply.code(400).send({ message: 'Order cannot be delivered from current status' });
      }
      return reply.code(500).send({ message: 'Something went wrong' });
    }
  });
}