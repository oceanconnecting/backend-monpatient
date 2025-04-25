import { PrismaClient } from '@prisma/client';

export class ChatServicePatientNurse {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = new PrismaClient();
    this.connectedUsers = new Map();
  }

  // Helper method to send JSON messages
  sendJson(connection, data) {
    connection.send(JSON.stringify(data));
  }

  // Helper method to handle errors
  handleError(connection, message) {
    this.sendJson(connection, { type: "error", message });
    connection.close();
  }

  // Helper method to parse incoming messages
  parseMessage(message) {
    try {
      return JSON.parse(message.toString());
    } catch (error) {
      // Handle the error appropriately
      console.error("An error occurred:", error.message);
      // You could add more specific error handling logic here
      throw new Error(`Invalid message format: ${error.message}`);
    }
  }

  async handleConnection(connection, req) {
    try {
      // Extract token from query parameter
      const token = req.query.token;
      if (!token) {
        this.handleError(connection, "No token provided");
        return;
      }

      // Verify token
      const decoded = this.fastify.jwt.verify(token);
      const userId = decoded.id;

      console.log("New client connected:", decoded.email,decoded.role);

      // Store user connection
      connection.user = decoded;
      this.connectedUsers.set(userId, connection);

      // Send confirmation
      this.sendJson(connection, { type: "connected", userId });

      // Handle messages
      connection.on("message", async (message) => {
        try {
          const data = this.parseMessage(message);
          await connection.close();
          this.sendJson(connection, {
            type: "success",
            message: "Message processed successfully",
            data,
          });
        } catch (error) {
          console.error("Error handling message:", error);
          this.sendJson(connection, {
            type: "error",
            message: "Failed to process message",
          });
        }
      });

      // Handle disconnection
      connection.on("close", () => {
        console.log("Client disconnected:", decoded.email);
        this.connectedUsers.delete(userId);
      });
    } catch (error) {
      console.error("Authentication error:", error);
      this.handleError(connection, "Authentication failed");
    }
  }

  async joinRoom(connection, roomId) {
    const userId = connection.user.id;
    const canJoin = await this.canUserJoinRoom(userId, roomId);
    if (canJoin) {
      console.log(`User ${userId} joined room ${roomId}`);
    }
  }

  async sendMessage(connection, data) {
    const { roomId, content } = data;
    const senderId = connection.user.id;
    const senderRole = connection.user.role;
    try {
      const message = await this.prisma.message.create({
        data: {
          content,
          isRead: false,
          senderRole,
          senderId,
          chatRoomPatientNurseId: roomId,
        },
      });
      this.broadcastToRoom(roomId, 'new-message', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  async handleTyping(connection, roomId) {
    const userId = connection.user.id;
    this.broadcastToRoom(roomId, 'user-typing', { userId, roomId });
  }

  async markMessagesAsRead(roomId, userId) {
    await this.prisma.message.updateMany({
      where: {
        chatRoomPatientNurseId: roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
    this.broadcastToRoom(roomId, 'messages-read', { userId, roomId });
  }

  async canUserJoinRoom(userId, roomId) {
    const room = await this.prisma.chatRoomPatientNurse.findUnique({
      where: { id: roomId },
      include: { patient: { include: { user: true } }, nurse: { include: { user: true } } },
    });
    return room && (room.patient.user.id === userId || room.nurse.user.id === userId);
  }

  broadcastToRoom(roomId, event, data) {
    const message = JSON.stringify({ event, data });
    this.connectedUsers.forEach((connection) => {
      if (connection.socket.readyState === 1) {
        connection.socket.send(message);
      }
    });
  }
}