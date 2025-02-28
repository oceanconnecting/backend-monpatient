import websocket from "@fastify/websocket";
import { ChatServicePatientNurseDoctor } from "../services/chat/chat-pationt-nurse-doctor.service.js";
import { ChatService } from "../services/chat/chat.service.js";
import { ChatServicePatientNurse } from "../services/chat/chat-pation-nurse.service.js";

export async function websocketRoutes(fastify, options) {
  // Register WebSocket plugin
  // await fastify.register(websocket, {
  //   options: { maxPayload: 1048576 } // 1MB max payload
  // });

  // Create chat service instances
  const chatServicePatientNurseDoctor = new ChatServicePatientNurseDoctor(fastify);
  const chatService = new ChatService(fastify);
  const chatServicePatientNurse = new ChatServicePatientNurse(fastify);

  // Define WebSocket routes
  fastify.get('/ws/patient-nurse-doctor', { websocket: true }, (connection, req) => {
    chatServicePatientNurseDoctor.handleConnection(connection, req);
  });

  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    chatService.handleConnection(connection, req);
  });

  fastify.get('/ws/patient-nurse', { websocket: true }, (connection, req) => {
    chatServicePatientNurse.handleConnection(connection, req);
  });

  // New test route for checking WebSocket functionality
  fastify.get('/ws/test', { websocket: true }, (connection, req) => {
    console.log('New test connection established');

    // Listen for messages using connection.on (not connection.socket.on)
    connection.on('message', (data) => {
      try {
        console.log('Received data:', data.toString());
        // Parse and handle the message
        handleMessage(data, connection);
      } catch (error) {
        console.error('Message handling error:', error);
      }
    });

    // Handle connection close
    connection.on('close', () => {
      console.log('Test connection closed');
    });

    // Handle socket errors
    connection.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send a welcome message
    connection.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to WebSocket test endpoint',
      timestamp: new Date().toISOString()
    }));
  });

  // Helper function to handle incoming messages
  function handleMessage(message, connection) {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message on test route:', data);

      // Response message
      const response = JSON.stringify({
        type: 'response',
        originalMessage: data,
        timestamp: new Date().toISOString(),
        status: 'success'
      });

      connection.send(response);

      // If it's a ping, send a pong
      if (data.type === 'ping') {
        const pong = JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        });

        connection.send(pong);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg = JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });

      connection.send(errorMsg);
    }
  }
}