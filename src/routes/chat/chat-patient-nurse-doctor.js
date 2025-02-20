import { ChatServicePatientNurseDoctor } from "../../services/chat/chat-pationt-nurse-doctor.service.js";
import { checkRole } from "../../middleware/auth.middleware.js";

export async function chatPatientNurseDoctorRoutes(fastify, options) {
  const chatService = new ChatServicePatientNurseDoctor(fastify.io);

  // Create or get chat room between patient, nurse, and doctor
  fastify.post("/room", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    schema: {
      body: {
        type: "object",
        required: ["nurseId", "doctorId"],
        properties: {
          nurseId: { type: "string" }, // Nurse ID
          doctorId: { type: "string" }, // Doctor ID
        },
      },
    },
    handler: async (request, reply) => {
      try {
        if (request.user.role !== "PATIENT") {
          return reply
            .code(403)
            .send({ error: "Only patients can initiate chats" });
        }

        if (!request.user.patient || !request.user.patient.id) {
          return reply.code(400).send({ error: "Patient data not found" });
        }
        const room = await chatService.createOrGetRoom(
          request.user.patient.id,
          request.body.nurseId,
          request.body.doctorId
        );

        return room;
      } catch (error) {
        console.error("Error creating/getting room:", error);
        reply.code(500).send({ error: error.message });
      }
    },
  });
  // Get user's chat rooms (patient, nurse, or doctor)
  fastify.get("/rooms", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT", "NURSE"])],
    handler: async (request, reply) => {
      try {
        const rooms = await chatService.getUserRooms(
          request.user.id, // User ID
          request.user.role // User role (PATIENT or NURSE)
        );
        return rooms;
      } catch (error) {
        console.error("Error getting rooms:", error);
        reply.code(400).send({ error: error.message });
      }
    },
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
        console.error("Error sending message:", error);
        reply.code(500).send({ error: error.message });
      }
    },
  });
  // Get room messages
  fastify.get("/room/:roomId/messages", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        const messages = await chatService.getRoomMessages(
          request.params.roomId,
          request.user.id
        );
        return messages;
      } catch (error) {
        console.error("Error getting messages:", error);
        reply.code(500).send({ error: error.message });
      }
    },
  });
  // Mark messages as read in a room
  fastify.post("/room/:roomId/messages/read", {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      try {
        await chatService.markMessagesAsRead(
          request.params.roomId,
          request.user.id
        );
        return { success: true };
      } catch (error) {
        console.error("Error marking messages as read:", error);
        reply.code(500).send({ error: error.message });
      }
    },
  });
}
