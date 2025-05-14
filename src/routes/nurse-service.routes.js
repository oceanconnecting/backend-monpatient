import { NurseServiceService } from "../services/relationships/nurse-service.service.js";
import { checkRole } from "../middleware/auth.middleware.js";

export async function nurseServiceRoutes(fastify) {
  
  // Get nurse dashboard stats
  fastify.get('/dashboard-stats', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    handler: async (request, reply) => {
      try {
        const stats = await NurseServiceService.getNurseDashboardStats(
          request.user.nurse.id
        );
        return stats;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Patient creates a service request
  const createVisitSchema = {
    body: {
      type: 'object',
      required: ['patientId', 'notes'],
      properties: {
        patientId: { type: 'string' },
        notes: { type: 'string' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nurseId: { type: 'string' },
          patientId: { type: 'string' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  };

  fastify.post('/create-visite', {
    schema: createVisitSchema,
    preValidation: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { patientId, notes } = request.body;
        const nurseId = request.user.nurse.id;
        
        if (!nurseId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Only nurses can create visits'
          });
        }
        
        const visit = await NurseServiceService.createVisit(nurseId, patientId, notes);
        
        return reply.status(201).send(visit);
      } catch (error) {
        console.error('Create visit error:', error);
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
  });

  // Get nurse visits with pagination
  fastify.get('/visite', {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          patientId: { type: 'string' },
          visitId: { type: 'string' },
          dateFrom: { type: 'string', format: 'date' },
          dateTo: { type: 'string', format: 'date' }
        }
      }
    },
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    handler: async (request, reply) => {
      try {
        const { page = 1, limit = 10, ...otherFilters } = request.query;
        const visits = await NurseServiceService.getNurseVisits(
          request.user.nurse.id,
          page,
          limit,
          otherFilters
        );
        return visits;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  fastify.put('/visite/:visitId', {
    schema: createVisitSchema,
    preValidation: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const { visitId } = request.params;
        const nurseId = request.user.nurse.id;
        
        if (!nurseId) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Only nurses can update visits'
          });
        }
        
        const visit = await NurseServiceService.updateVisit(nurseId, visitId, request.body);
        return reply.status(200).send(visit);
      } catch (error) {
        console.error('Update visit error:', error);
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
  });

  fastify.post("/request", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: {
        type: "object",
        required: [
          "nurseId",
          "serviceType",
          "description",
          "preferredDate",
          "urgency",
          "location",
        ],
        properties: {
          nurseId: { type: "string" },
          serviceType: { type: "string" },
          description: { type: "string" },
          preferredDate: { type: "string", format: "date-time" },
          urgency: { type: "string", enum: ["Low", "Medium", "High"] },
          location: { type: "string" },
        },
      },
      response: {
        201: {
          description: "Service request created successfully",
          type: "object",
          properties: {
            id: { type: "string" },
            patientId: { type: "string" },
            nurseId: { type: "string" },
            serviceType: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.createServiceRequest(
          request.user.patient.id,
          request.body,
          reply
        );

        if (result) {
          return reply.code(201).send(result);
        }
      } catch (error) {
        request.log.error(error);

        if (error.code === "P2003") {
          return reply.code(400).send({
            error: "Invalid Reference",
            message: "One of the referenced entities does not exist",
          });
        }

        return reply.code(500).send({
          error: "Internal Server Error",
          message: "An unexpected error occurred",
        });
      }
    },
  });

  // Nurse views available service requests with pagination
  fastify.get("/available", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
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
      try {
        const { page = 1, limit = 10 } = request.query;
        const requests = await NurseServiceService.getAvailableRequests(
          request.user.nurse.id,
          page,
          limit
        );
        return requests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Nurse accepts a service request
  fastify.put("/accept/:requestId", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
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
        const result = await NurseServiceService.acceptRequest(
          request.params.requestId,
          request.user.nurse.id
        );
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Nurse updates service status
  fastify.put("/status/:requestId", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
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
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
          },
          notes: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.updateRequestStatus(
          request.params.requestId,
          request.user.nurse.id,
          request.body.status,
          request.body.notes
        );
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Patient rates completed service
  fastify.put("/rate", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: {
        type: "object",
        required: ["rating", "requestId"],
        properties: {
          rating: { type: "integer", minimum: 1, maximum: 5 },
          requestId: { type: "string" },
          feedback: { type: "string" }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseServiceService.rateService(
          request.body.requestId,
          request.user.patient.id,
          request.body.rating,
          request.body.feedback
        );
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  });

  // Patient views their service requests with pagination
  fastify.get("/patient/requests", {
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
      try {
        const { page = 1, limit = 10 } = request.query;
        const requests = await NurseServiceService.getPatientRequests(
          request.user.patient.id,
          page,
          limit
        );
        return requests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Nurse views their service requests with pagination and status filter
  fastify.get("/requests", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          status: { type: 'string', enum: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
        }
      }
    },
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    handler: async (request, reply) => {
      try {
        const { page = 1, limit = 10, status = null } = request.query;
        const requests = await NurseServiceService.getNurseRequests(
          request.user.nurse.id,
          page,
          limit,
          status
        );
        return requests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Nurse views their patients with pagination
  fastify.get("/patients", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
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
      try {
        const { page = 1, limit = 10 } = request.query;
        const patients = await NurseServiceService.nursePatients(
          request.user.nurse.id,
          page,
          limit
        );
        return patients;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Patient cancels their service request
  fastify.put("/cancel/:requestId", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
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
        const result = await NurseServiceService.cancelRequest(
          request.params.requestId,
          request.user.patient.id
        );
        return result;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  // Nurse searches for a patient
  fastify.get("/patient/search", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    schema: {
      querystring: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Patient name (first or last name)",
            minLength: 0,
            maxLength: 100,
            pattern: "^[a-zA-Z -]*$",
          },
          page: {
            type: "integer",
            minimum: 1,
            default: 1,
            description: "Page number for pagination",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 20,
            description: "Number of records per page",
          },
          sortBy: {
            type: "string",
            enum: ["name", "createdAt", "status"],
            default: "name",
            description: "Field to sort by",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            default: "asc",
            description: "Sort order",
          },
        },
        additionalProperties: false,
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  userId: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  gender: { type: "string" },
                  profilePhoto: { type: "string", nullable: true },
                  telephoneNumber: { type: "string", nullable: true },
                  dateOfBirth: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                  },
                  bloodType: { type: "string", nullable: true },
                  allergies: { type: "string", nullable: true },
                  chronicDiseases: { type: "string", nullable: true },
                  role: { type: "string" },
                  serviceRequestId: { type: "string" },
                  serviceType: { type: "string" },
                  status: { type: "string" },
                  createdAt: { type: "string", format: "date-time" },
                  preferredDate: {
                    type: "string",
                    format: "date-time",
                    nullable: true,
                  },
                },
              },
            },
            pagination: {
              type: "object",
              properties: {
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
                pages: { type: "integer" },
              },
            },
          },
        },
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        401: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        403: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        500: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: async (request, reply) => {
      try {
        const {
          name = "",
          page = 1,
          limit = 20,
          sortBy = "name",
          sortOrder = "asc",
        } = request.query;
        const nurseId = request.user.nurse.id;

        const result = await NurseServiceService.searchPatient(
          nurseId,
          name.trim(),
          page,
          limit,
          sortBy,
          sortOrder
        );

        return result;
      } catch (error) {
        request.log.error("Patient search failed:", error);
        if (error) {
          reply.code(400).send({ error: "Database error occurred" });
        } else {
          reply.code(500).send({ error: "Internal server error" });
        }
      }
    },
  });

  // Nurse views their requests with pagination
  fastify.get("/", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          status: { type: 'string', enum: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
        }
      }
    },
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    handler: async (request, reply) => {
      try {
        const { page = 1, limit = 10, status = null } = request.query;
        const requests = await NurseServiceService.getRequests(
          request?.user?.nurse?.id,
          page,
          limit,
          status
        );
        return requests;
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    },
  });

  fastify.get("/patient/:patientId", {
    onRequest: [fastify.authenticate, checkRole(["NURSE"])],
    config: {
      cache: {
        expiresIn: 300000 // 5 minutes in milliseconds
      }
    },
    handler: async (request) => {
      const requests = await NurseServiceService.nursePatientsbyPatientId(
        request.params.patientId,
        request?.user?.nurse?.id
      );
      return requests;
    },
  });

  fastify.delete("/:requestId",
    async (request, reply) => {
      try {
        const { requestId } = request.params;
        const nurseId = request?.user?.nurse?.id;

        const result = await NurseServiceService.nursedeletePatientServiceRequest(
          requestId,
          nurseId
        );

        reply.code(200).send(result);
      } catch (error) {
        reply.code(400).send({ error: error.message });
      }
    }
  );
}