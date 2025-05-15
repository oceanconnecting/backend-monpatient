import { DoctorPatientService } from "../../services/relationships/doctor-patient.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function doctorPatientRoutes(fastify) {
  // Reusable schemas
  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
    }
  };

  const requestIdParamSchema = {
    type: "object",
    required: ["requestId"],
    properties: {
      requestId: { type: "string" },
    }
  };

  // Common cache config
  const cacheConfig = {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  };

  // Helper function for common role checks and error handling
  const createHandler = (roleType, handler) => {
    return async (request, reply) => {
      const { page = 1, limit = 10 } = request.query;
      
      try {
        // Role check
        if (!request.user[roleType]) {
          return reply.code(400).send({ error: `User is not a ${roleType}` });
        }
        
        // Execute the actual handler logic
        return await handler(request, reply, { page, limit });
        
      } catch (error) {
        request.log.error(error);
        return reply.code(400).send({ error: error.message });
      }
    };
  };

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
    handler: createHandler("patient", async (request) => {
      return await DoctorPatientService.sendRequest(
        request.user.patient.id,
        request.body.doctorId,
        request.body.message
      );
    }),
  });

  // Accept request
  fastify.post("/requests/:requestId/accept", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      params: requestIdParamSchema
    },
    handler: createHandler("doctor", async (request) => {
      return await DoctorPatientService.acceptRequest(
        request.params.requestId,
        request.user.doctor.id
      );
    }),
  });

  // Reject request
  fastify.post("/requests/:requestId/reject", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      params: requestIdParamSchema,
      body: {
        type: "object",
        properties: {
          reason: { type: "string" },
        },
      }
    },
    handler: createHandler("doctor", async (request) => {
      return await DoctorPatientService.rejectRequest(
        request.params.requestId,
        request.user.doctor.id,
        request.body.reason
      );
    }),
  });

  // Get doctor's patients
  fastify.get("/patients", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    schema: {
      querystring: paginationSchema
    },
    config: cacheConfig,
    handler: createHandler("doctor", async (request, reply, { page, limit }) => {
      return await DoctorPatientService.getDoctorPatients(
        request.user.doctor.id,
        page,
        limit
      );
    }),
  });

  // Get specific patient by ID
  fastify.get("/patients/:patientId", {
    onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
    config: cacheConfig,
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
      querystring: paginationSchema
    },
    config: cacheConfig,
    handler: createHandler("patient", async (request, reply, { page, limit }) => {
      return await DoctorPatientService.getPatientDoctors(
        request.user.patient.id,
        page,
        limit
      );
    }),
  });

  // Doctor routes with common pattern
  const doctorRoutes = [
    {
      path: "/requests/pending",
      serviceMethod: "getPendingRequests"
    },
    {
      path: "/requests",
      serviceMethod: "getAllRequests"
    },
    {
      path: "/patients/order",
      serviceMethod: "doctorPatientbyorder"
    },
    {
      path: "/medical-records",
      serviceMethod: "doctormedicalrecords"
    }
  ];

  // Register all doctor routes with the same pattern
  doctorRoutes.forEach(({ path, serviceMethod }) => {
    fastify.get(path, {
      onRequest: [fastify.authenticate, checkRole(["DOCTOR"])],
      schema: {
        querystring: paginationSchema
      },
      config: cacheConfig,
      handler: createHandler("doctor", async (request, reply, { page, limit }) => {
        return await DoctorPatientService[serviceMethod](
          request.user.doctor.id,
          page,
          limit
        );
      })
    });
  });
}