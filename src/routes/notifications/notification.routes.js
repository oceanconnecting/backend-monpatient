import { 
  getUnreadNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  getAllNotifications, 
  createNotification 
} from '../../middleware/notification.middleware.js'
import { checkRole } from '../../middleware/auth.middleware.js'

export async function notificationRoutes(fastify) {
   const connectedUsers = new Map();

  // Helper methods for WebSocket connections
  const wsHelpers = {
    fastify,
    connectedUsers,
    
    // Send JSON data to WebSocket connection
    sendJson(ws, data) {
      if (ws && ws.readyState === 1) { // 1 = OPEN
        ws.send(JSON.stringify(data));
        return true;
      }
      return false;
    },
    
    // Send error message to client
    handleError(ws, message) {
      if (ws && ws.readyState === 1) {
        this.sendJson(ws, { type: "error", message });
      }
    },
    
    // Handle incoming WebSocket messages
    async handleMessage(ws, userId, data) {
      try {
        console.log(`Received data from ${userId}`, data);
        
        switch (data.type) {
          case 'PING':
            this.sendJson(ws, { type: 'PONG' });
            break;
          default:
            console.log(`Unhandled message type ${data.type}`);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        this.handleError(ws, "Failed to process message");
      }
    },
    
    // Handle new WebSocket connections
    async handleConnection(ws, req) {
      try {
        // Extract token from query parameter
        const token = req.query.token;
        if (!token) {
          this.handleError(ws, "No token provided");
          ws.close(1008, 'Unauthorized');
          return;
        }
        
        // Verify JWT token
        const decoded = this.fastify.jwt.verify(token);
        const userId = decoded.id;
        
        console.log("New client connected:", decoded.email, decoded.role);
        
        // Store the WebSocket connection
        this.connectedUsers.set(userId, ws);
        
        // Send welcome message
        this.sendJson(ws, { 
          type: "connected", 
          userId,
          message: 'WebSocket connection established' 
        });
        
        // Setup message handler
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            this.handleMessage(ws, userId, data);
          } catch (error) {
            console.error("Error handling message:", error);
            this.handleError(ws, "Failed to process message");
          }
        });
        
        // Setup error handler
        ws.on('error', (error) => {
          console.error(`WebSocket error for user: ${userId}`, error);
          this.connectedUsers.delete(userId);
        });
        
        // Setup close handler
        ws.on('close', () => {
          console.log("Client disconnected:", decoded.email);
          this.connectedUsers.delete(userId);
        });
      } catch (error) {
        console.error("Authentication error:", error);
        if (ws && ws.readyState === 1) {
          this.handleError(ws, "Authentication failed");
          ws.close(1008, 'Authentication failed');
        }
      }
    }
  };

  // WebSocket endpoint - IMPORTANT: Use the correct connection handler signature
  fastify.get('/ws', { websocket: true }, (connection /* SocketStream */, req /* FastifyRequest */) => {
    // The connection object is the WebSocket stream
    wsHelpers.handleConnection(connection, req);
  });

  // Send to specific user
  function sendToUser(userId, message) {
    const ws = connectedUsers.get(userId);
    if (ws && ws.readyState === 1) {
      try {
        ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending to userId ${userId}`, error);
        connectedUsers.delete(userId);
      }
    }
    return false;
  }

  // Broadcast to all connected users
  function broadcastNotification(message) {
    const serializedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    let successCount = 0;
    
    connectedUsers.forEach((ws, userId) => {
      try {
        if (ws && ws.readyState === 1) {
          ws.send(serializedMessage);
          successCount++;
        }
      } catch (error) {
        console.error(`Error sending to userId ${userId}`, error);
        connectedUsers.delete(userId);
      }
    });
    
    return successCount;
  }

  // Make WebSocket functions available to other parts of the app
  fastify.decorate('websocket', {
    connectedUsers,
    sendToUser,
    broadcastNotification
  });

  // Get all notifications
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notifications = await getAllNotifications(request.user.id, request.user.role);
        return notifications;
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message });
        } else {
          reply.code(500).send({ error: error.message });
        }
      }
    }
  });

  // Get all unread notifications for the authenticated user
  fastify.get('/unread', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notifications = await getUnreadNotifications(request.user.id, request.user.role);
        return notifications;
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message });
        } else {
          reply.code(500).send({ error: error.message });
        }
      }
    }
  });

  // Mark a notification as read
  fastify.put('/:id/read', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        const notification = await markNotificationAsRead(
          id, 
          request.user.id,
          request.user.role
        );
        
        // Notify user via WebSocket
        sendToUser(request.user.id, {
          type: 'NOTIFICATION_READ',
          notificationId: id,
          userId: request.user.id
        });
        
        return notification;
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message });
        } else if (error.message === 'Notification not found') {
          reply.code(404).send({ error: error.message });
        } else {
          reply.code(500).send({ error: error.message });
        }
      }
    }
  });

  // Create a new notification (admin only)
  fastify.post('/', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const notification = await createNotification(request.body, request.user.id);
        
        // Notify recipient via WebSocket
        if (request.body.recipientId) {
          sendToUser(request.body.recipientId, {
            type: 'NEW_NOTIFICATION',
            notification
          });
        }
        
        reply.code(201).send(notification);
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message });
        } else {
          reply.code(500).send({ error: error.message });
        }
      }
    }
  });

  // Delete a notification (admin only)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
    preValidation: [checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const { id } = request.params;
        await deleteNotification(id, request.user.id);
        reply.code(204).send();
      } catch (error) {
        if (error.name === 'UnauthorizedError') {
          reply.code(403).send({ error: error.message });
        } else if (error.message === 'Notification not found') {
          reply.code(404).send({ error: error.message });
        } else {
          reply.code(500).send({ error: error.message });
        }
      }
    }
  });
}