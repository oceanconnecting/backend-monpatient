import { getPrescriptionsByPharmacy } from '../services/pharmacy.prescription.service.js';  // Import the function from the service

export default async function pharmacyPerscriptionRoutes(fastify) {
  fastify.get('/pharmacy/prescriptions', {
    preHandler: [fastify.authenticate]  // هنا كتضيف authenticate ف preHandler باش تدير التوثيق قبل ما توصل للـ route
  }, async (request, reply) => {
    try {
      const { pharmacyId } = request.query;

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
