import { checkRole } from "../middleware/auth.middleware.js";
import { PatientService } from "../services/users/patients.service.js";

export async function patientRoutes(fastify) {
  fastify.get("/doctors", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const doctors = await PatientService.getAlldoctors(request.user.id);
        reply.code(200).send(doctors);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });

  fastify.get("/nurses", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const nurses = await PatientService.getAllnurses(request.user.id);
        reply.code(200).send(nurses);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });

  fastify.get("/pharmacies", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const pharmacies = await PatientService.getAllpharmacies(
          request.user.id
        );
        reply.code(200).send(pharmacies);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  
  fastify.get("/emergency-contact/:id", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const emergencyContact = await PatientService.getEmergencyContact(request.params.id);
        reply.code(200).send(emergencyContact);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  fastify.put("/emergency-contact/:id", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const emergencyContact = await PatientService.updateEmergencyContact(request.params.id, request.body);
        reply.code(200).send(emergencyContact);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  fastify.post('/send-prescription-pharmacy', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const prescription = await PatientService.patientsendOrderMedicine(request.user.patient.id, request.body);
        reply.code(200).send(prescription);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
}