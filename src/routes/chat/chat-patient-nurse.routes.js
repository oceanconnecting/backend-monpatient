import { ChatServicePatientNurse } from "../../services/chat/chat-pation-nurse.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function chatPatientNurseRoutes(fastify, options) {
  const chatService = new ChatServicePatientNurse(fastify.io);

  // Helper function to handle errors
  const handleError = (reply, error) => {
    console.error(error);
    reply.code(400).send({ error: error.message });
  };

  // Helper function to authenticate and check roles
  const authenticateAndCheckRole = (roles) => [
    fastify.authenticate,
    checkRole(roles),
  ];

  // Create or get chat room between patient and nurse
  fastify.post("/room", {
    websocket: true,
    onRequest: authenticateAndCheckRole(["PATIENT"]),
    schema: {
      body: {
        type: "object",
        required: ["nurseId"],
        properties: {
          nurseId: { type: "string" }, // Nurse ID to start a chat with
        },
      },
    },
    handler: async (request, reply) => {
      try {
        // Only patients can initiate chats with nurses
        if (request.user.role !== "PATIENT") {
          throw new Error("Only patients can initiate chats with nurses");
        }

        // Ensure the patient profile exists
        if (!request.user.patient?.id) {
          throw new Error("Patient data not found");
        }

        // Create or get the chat room
        const room = await chatService.createOrGetRoom(
          request.user.patient.id, // Patient ID
          request.body.nurseId // Nurse ID
        );

        return room;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Get user's chat rooms (patient or nurse)
  fastify.get("/rooms", {
    websocket: true,
    onRequest: authenticateAndCheckRole(["PATIENT", "NURSE"]),
    handler: async (request, reply) => {
      try {
        const rooms = await chatService.getUserRooms(
          request.user.id, // User ID
          request.user.role // User role (PATIENT or NURSE)
        );
        return rooms;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Send message in a room
  fastify.post("/room/:roomId/message", {
    websocket: true,
    onRequest: fastify.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string" },
        },
      },
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
    websocket: true,
    onRequest: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        const messages = await chatService.getRoomMessages(
          request.params.roomId, // Room ID
          request.user.id // User ID (to verify access)
        );
        return messages;
      } catch (error) {
        handleError(reply, error);
      }
    },
  });

  // Mark messages as read in a room
  fastify.post("/room/:roomId/messages/read", {
    websocket: true,
    onRequest: fastify.authenticate,
    handler: async (request, reply) => {
      try {
        await chatService.markMessagesAsRead(
          request.params.roomId, // Room ID
          request.user.id // User ID (to mark messages as read)
        );
        return { success: true };
      } catch (error) {
        handleError(reply, error);
      }
    },
  });
}