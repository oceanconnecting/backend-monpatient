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
  fastify.post("/requests/:requestId/accept", {
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
  fastify.post("/requests/:requestId/reject", {
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
   schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
  config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
  handler: async (request, reply) => {
    const { page = 1, limit = 10 } = request.query;
    try {
      if (!request.user.doctor) {
        reply.code(400).send({ error: "User is not a doctor" });
        return;
      }
      
      const patients = await DoctorPatientService.getDoctorPatients(
        request.user.doctor.id,
         page,
          limit
      );
      
      return patients;
    } catch (error) {
      reply.code(400).send({ error: error.message });
    }
  },
  });
  fastify.get("/patients/:patientId", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    schema: {
      params: {
        type: "object",
        required: ["patientId"],
        properties: {
          patientId: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          return reply.code(403).send({ error: "User is not a doctor" });
        }
        
        const patient = await DoctorPatientService.getDoctorPatientById(
          request.user.doctor.id,
          request.params.patientId
        );
        
        if (!patient) {
          return reply.code(404).send({ 
            error: "Patient not found or not associated with this doctor" 
          });
        }
        
        return patient;
      } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  });

  // Get patient's doctors
  fastify.get("/doctors", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
       schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      try {
        if (!request.user.patient) {
          reply.code(400).send({ error: "User is not a patient" });
          return;
        }

        const doctors = await DoctorPatientService.getPatientDoctors(
          request.user.patient.id,
          page,
          limit
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
       schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const pendingRequests = await DoctorPatientService.getPendingRequests(
          request.user.doctor.id,
          page,
          limit
        );
        return pendingRequests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  fastify.get("/requests", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
      schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }

        const pendingRequests = await DoctorPatientService.getAllRequests(
          request.user.doctor.id,
          page,
          limit
        );
        return pendingRequests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });
  fastify.get("/patients/order", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
       schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      try {
        if (!request?.user?.doctor) {
          reply.code(400).send({ error: "User is not a doctor" });
          return;
        }
        const patients = await DoctorPatientService.doctorPatientbyorder(
          request?.user?.doctor?.id,
          page,
          limit
        );
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  })
  
  fastify.get("/medical-records", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
       schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      try {
        const patients = await DoctorPatientService.doctormedicalrecords(
          request?.user?.doctor?.id,
          page,
          limit
        )
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  })
}
