import { ChatServicePatientNurseDoctor } from "../services/chat/chat-pationt-nurse-doctor.service.js";
import { ChatService } from "../services/chat/chat.service.js";
import { ChatServicePatientNurse } from "../services/chat/chat-pation-nurse.service.js";
import fastifyWebsocket from "@fastify/websocket";

export async function websocketRoutes(fastify, options) {
  // Register WebSocket plugin
  fastify.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 } // 1MB max payload
  });
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
  fastify.get('/ws/patient-nurse', { websocket: true }, (connection, req) => 
    chatServicePatientNurse.handleConnection(connection, req)
  );
  
  // New test route for checking WebSocket functionality
  fastify.get('/ws/test', { websocket: true }, (connection, req) => {
    console.log('New test connection established');
    
    // Get a reference to the socket
    const socket = connection.socket;
    
    // Log when data is received
    socket.on('data', (message) => {
      console.log('Received data:', message.toString());
      
      // Echo the message back
      socket.write(message);
    });
    
    // Log when the connection closes
    socket.on('end', () => {
      console.log('Test connection closed (end event)');
    });
    
    // Log any errors
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  // Helper function to handle incoming messages
  function handleMessage(message, connection) {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message on test route:', data);
      
      // Attempt to send response using available method
      const response = JSON.stringify({
        type: 'response',
        originalMessage: data,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
      
      // Try different sending methods
      if (typeof connection.socket.send === 'function') {
        connection.socket.send(response);
      } 
      else if (typeof connection.socket.write === 'function') {
        connection.socket.write(response);
      }
      else if (typeof connection.send === 'function') {
        connection.send(response);
      }
      
      // If it's a ping, send a pong
      if (data.type === 'ping') {
        const pong = JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        
        if (typeof connection.socket.send === 'function') {
          connection.socket.send(pong);
        } 
        else if (typeof connection.socket.write === 'function') {
          connection.socket.write(pong);
        }
        else if (typeof connection.send === 'function') {
          connection.send(pong);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg = JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      });
      
      if (typeof connection.socket.send === 'function') {
        connection.socket.send(errorMsg);
      } 
      else if (typeof connection.socket.write === 'function') {
        connection.socket.write(errorMsg);
      }
      else if (typeof connection.send === 'function') {
        connection.send(errorMsg);
      }
    }
  }
}