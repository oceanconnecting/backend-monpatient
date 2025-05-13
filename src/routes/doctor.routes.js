import { DoctorService } from "../services/users/doctor.service.js";
import { checkRole } from "../middleware/auth.middleware.js";

export async function doctorRoutes(fastify) {
  // Search doctors by name - no authentication required
  fastify.get("/search", {
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const { name } = request.query;

        // If no name is provided, return all doctors
        if (!name) {
          const doctors = await DoctorService.getAllDoctors();
          return doctors;
        }

        const doctors = await DoctorService.searchDoctorsByName(name);
        return doctors;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  });
  fastify.get("/", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        const doctors = await DoctorService.getAllDoctors();
        return doctors;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  });
  fastify.post("/", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        const doctor = await DoctorService.createDoctor(request.body);
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  });
  fastify.put("/:id", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        const id = request.params.id;
        const doctor = await DoctorService.updateDoctorById(id, request.body);
        return doctor;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  });
}