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

  fastify.post("/", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const patient = await PatientService.createPatient(request.body, request.file);
        reply.code(200).send(patient);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });

  fastify.put('/:id/details', {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const {
          allergies,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
          insuranceInfo,
          preferredPharmacy
        } = request.body;  // Changed from req.body to request.body
        
        // Create data object with patient details
        const detailsData = {
          allergies,
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
          insuranceInfo,
          preferredPharmacy
        };
        
        // Update patient details using the service
        const updatedPatient = await PatientService.updatePatientDetails(id, detailsData);
        
        return reply.code(200).send({  // Changed from res.status to reply.code
          success: true,
          message: 'Patient details updated successfully',
          data: updatedPatient
        });
      } catch (error) {
        return reply.code(400).send({  // Changed from res.status to reply.code
          success: false,
          message: error.message
        });
      }
    }
  });
}