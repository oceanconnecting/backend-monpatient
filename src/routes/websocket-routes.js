import { ChatServicePatientNurseDoctor } from "../services/chat/chat-pationt-nurse-doctor.service.js";
import { ChatService } from "../services/chat/chat.service.js";
import fastifyWebsocket from "@fastify/websocket";

export async function websocketRoutes(fastify, options) {
  // Register WebSocket plugin
  fastify.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 } // 1MB max payload
  });

  // Create chat service instances
  const chatServicePatientNurseDoctor = new ChatServicePatientNurseDoctor(fastify);
  const chatService = new ChatService(fastify);

  // Define WebSocket routes
  fastify.get('/ws/patient-nurse-doctor', { websocket: true }, (connection, req) => {
    chatServicePatientNurseDoctor.handleConnection(connection, req);
  });

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    chatService.handleConnection(connection, req);
  });
}
