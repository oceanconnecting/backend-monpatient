import { DoctorService } from "../services/doctor/doctor.service.js";
import { checkRole } from "../middleware/auth.middleware.js";

export async function doctorRoutes(fastify) {
  fastify.get("/", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        const doctors = await DoctorService.getAllDoctors();
        return doctors;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.get('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const doctor = await DoctorService.getDoctorById(id);
        if (!doctor) {
          return reply.code(404).send({ error: 'Doctor not found' });
        }
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const doctor = await DoctorService.createDoctor(request.body);
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });

  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const doctor = await DoctorService.updateDoctorById(id, request.body);
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    }
  });
}
