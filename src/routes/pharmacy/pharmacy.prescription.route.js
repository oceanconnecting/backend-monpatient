import { getPrescriptionsByPharmacy } from '../../services/pharmacies/pharmacy.prescription.service.js';

export default async function pharmacyPrescriptionRoutes(fastify) {
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limite: { type: 'integer', minimum: 1, default: 10, maximum: 100 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const pharmacyId = request.user?.pharmacy?.id;
      const { page, limite } = request.query;
      
      const prescriptions = await getPrescriptionsByPharmacy(pharmacyId, page, limite);
      return reply.send(prescriptions);
    } catch (error) {
      console.error(error);
      if (error.message === 'Pharmacy ID is required') {
        return reply.status(400).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}