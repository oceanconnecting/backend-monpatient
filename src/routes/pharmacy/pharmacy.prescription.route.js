import { getPrescriptionsByPharmacy } from '../../services/pharmacies/pharmacy.prescription.service.js';  // Import the function from the service

export default async function pharmacyPerscriptionRoutes(fastify) {
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const pharmacyId = request.user?.pharmacy?.id;

      const prescriptions = await getPrescriptionsByPharmacy(pharmacyId);

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
