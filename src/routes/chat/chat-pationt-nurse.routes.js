import { ChatServicePatientNurse } from "../../services/chat/chat-pation-nurse.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function chatPatientNurseRoutes(fastify) {
  const chatService = new ChatServicePatientNurse(fastify.io);

  // Utility function to handle errors
  const handleError = (reply, error) => {
    console.error(error);
    reply.code(400).send({ error: error.message });
  };

  // Middleware to validate patient data
  const validatePatientData = (request) => {
    if (request.user.role !== "PATIENT") {
      throw new Error("Only patients can initiate chats with nurses");
    }
    if (!request.user.patient?.id) {
      throw new Error("Patient data not found");
    }
  };

  // Common handler for chat operations
  const handleChatOperation = async (operation, request, reply) => {
    try {
      if (operation === "createOrGetRoom") {
        validatePatientData(request);
        return await chatService[operation](request.user.patient.id, request.body.nurseId);
      } else if (operation === "getUserRooms") {
        return await chatService[operation](request.user.id, request.user.role);
      } else if (operation === "sendMessage") {
        return await chatService[operation](request.params.roomId, request.user.id, request.user.role, request.body.content);
      } else if (operation === "getRoomMessages") {
        return await chatService[operation](request.params.roomId, request.user.id);
      } else if (operation === "markMessagesAsRead") {
        await chatService[operation](request.params.roomId, request.user.id);
        return { success: true };
      }
    } catch (error) {
      handleError(reply, error);
    }
  };

  // Create or get chat room between patient and nurse
  fastify.post("/room", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: {
        type: "object",
        required: ["nurseId"],
        properties: {
          nurseId: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => handleChatOperation("createOrGetRoom", request, reply),
  });

  // Get user's chat rooms (patient or nurse)
  fastify.get("/rooms", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT", "NURSE"])],
    handler: async (request, reply) => handleChatOperation("getUserRooms", request, reply),
  });

  // Send message in a room
  fastify.post("/room/:roomId/message", {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
        },
      },
    },
    handler: async (request, reply) => handleChatOperation("sendMessage", request, reply),
  });

  // Get room messages
  fastify.get("/room/:roomId/messages", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => handleChatOperation("getRoomMessages", request, reply),
  });

  // Mark messages as read in a room
  fastify.post("/room/:roomId/messages/read", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => handleChatOperation("markMessagesAsRead", request, reply),
  });
}