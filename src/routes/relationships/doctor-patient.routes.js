import { DoctorPatientService } from "../../services/relationships/doctor-patient.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function doctorPatientRoutes(fastify) {
  // Send request to doctor
  fastify.post("/request", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: {
        type: "object",
        required: ["doctorId"],
        properties: {
          doctorId: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.patient) {
          reply.code(400).send({ error: "User is not a patient" });
          return;
        }

        const result = await DoctorPatientService.sendRequest(
          request.user.patient.id,
          request.body.doctorId,
          request.body.message
        );
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  // Accept request
  fastify.post("/request/:requestId/accept", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      params: {
        type: "object",
        required: ["requestId"],
        properties: {
          requestId: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const result = await DoctorPatientService.acceptRequest(
          request.params.requestId,
          request.user.doctor.id
        );
        reply.code(200).send(result);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  // Reject request
  fastify.post("/request/:requestId/reject", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      params: {
        type: "object",
        required: ["requestId"],
        properties: {
          requestId: { type: "string" },
        },
      },
      body: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const result = await DoctorPatientService.rejectRequest(
          request.params.requestId,
          request.user.doctor.id,
          request.body.reason
        );
        reply.code(200).send(result);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Get doctor's patients
  fastify.get("/patients", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const patients = await DoctorPatientService.getDoctorPatients(
          request.user.doctor.id
        );
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Get patient's doctors
  fastify.get("/doctors", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        if (!request.user.patient) {
          reply.code(400).send({ error: "User is not a patient" });
          return;
        }

        const doctors = await DoctorPatientService.getPatientDoctors(
          request.user.patient.id
        );
        return doctors;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Get pending requests for doctor
  fastify.get("/requests/pending", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const pendingRequests = await DoctorPatientService.getPendingRequests(
          request.user.doctor.id
        );
        return pendingRequests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  fastify.get("/requests", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const pendingRequests = await DoctorPatientService.getAllRequests(
          request.user.doctor.id
        );
        return pendingRequests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  fastify.get("/patients/order", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    handler: async (request, reply) => {
      try {
        if (!request?.user?.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }
        const patients = await DoctorPatientService.doctorPatientbyorder(
          request?.user?.doctor?.id
        );
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  })
  
  fastify.get("/medical-records", {
    handler: async (request, reply) => {
      try {
        const patients = await DoctorPatientService.doctormedicalrecords(
          request?.user?.doctor?.id
        )
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  })
}
