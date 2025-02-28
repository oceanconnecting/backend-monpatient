import { ChatServicePatientNurseDoctor } from "../../services/chat/chat-pationt-nurse-doctor.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function chatPatientNurseDoctorRoutes(fastify, options) {
  const chatService = new ChatServicePatientNurseDoctor(fastify.io);

  // Helper method for error handling
  function handleError(reply, error, statusCode = 500) {
    console.error(error);
    reply.code(statusCode).send({ error: error.message });
  }

  // Reusable hook for authentication and role checking
  function authenticateAndCheckRole(roles) {
    return async (request, reply) => {
      await fastify.authenticate(request, reply);
      await checkRole(roles)(request, reply);
    };
  }

  // Common WebSocket configuration
  const websocketConfig = { websocket: true };

  // Reusable schemas
  const messageSchema = {
    type: "object",
    required: ["content"],
    properties: {
      content: { type: "string" },
    },
  };

  const roomCreationSchema = {
    type: "object",
    required: ["nurseId", "doctorId"],
    properties: {
      nurseId: { type: "string" },
      doctorId: { type: "string" },
    },
  };

  // Create or get chat room between patient, nurse, and doctor
  fastify.post("/room", {
    ...websocketConfig,
    onRequest: authenticateAndCheckRole(["PATIENT"]),
    schema: {
      body: roomCreationSchema,
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.patient?.id) {
          return reply.code(400).send({ error: "Patient data not found" });
        }

        const room = await chatService.createOrGetRoom(
          request.user.patient.id,
          request.body.nurseId,
          request.body.doctorId
        );

        return room;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Get user's chat rooms (patient, nurse, or doctor)
  fastify.get("/rooms", {
    ...websocketConfig,
    onRequest: authenticateAndCheckRole(["PATIENT", "NURSE"]),
    handler: async (request, reply) => {
      try {
        const rooms = await chatService.getUserRooms(
          request.user.id,
          request.user.role
        );
        return rooms;
      } catch (error) {
        handleError(reply, error, 400);
      }
    },
  });

  // Send message in a room
  fastify.post("/room/:roomId/message", {
    ...websocketConfig,
    onRequest: authenticateAndCheckRole(["PATIENT", "NURSE", "DOCTOR"]),
    schema: {
      body: messageSchema,
    },
    handler: async (request, reply) => {
      try {
        const message = await chatService.sendMessage(
          request.params.roomId,
          request.user.id,
          request.user.role,
          request.body.content
        );
        return message;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Get room messages
  fastify.get("/room/:roomId/messages", {
    ...websocketConfig,
    onRequest: authenticateAndCheckRole(["PATIENT", "NURSE", "DOCTOR"]),
    handler: async (request, reply) => {
      try {
        const messages = await chatService.getRoomMessages(
          request.params.roomId,
          request.user.id
        );
        return messages;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Mark messages as read in a room
  fastify.post("/room/:roomId/messages/read", {
    ...websocketConfig,
    onRequest: authenticateAndCheckRole(["PATIENT", "NURSE", "DOCTOR"]),
    handler: async (request, reply) => {
      try {
        await chatService.markMessagesAsRead(
          request.params.roomId,
          request.user.id
        );
        return { success: true };
      } catch (error) {
        handleError(reply, error);
      }
    },
  });
}