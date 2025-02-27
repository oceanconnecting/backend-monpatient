import { PrismaClient } from '@prisma/client';

export class ChatServicePatientNurse {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = new PrismaClient();
    this.connectedUsers = new Map();

    // this.fastify.register(require('@fastify/websocket'));

    // this.fastify.get('/ws/patient-nurse', { websocket: true }, (connection, req) => {
    //   this.handleConnection(connection, req);
    // });
  }

  async handleConnection(connection, req) {
    try {
      // Extract token from query parameter
      const token = req.query.token;
      if (!token) {
        connection.send(
          JSON.stringify({ type: "error", message: "No token provided" })
        );
        connection.close();
        return;
      }
  
      // Verify token
      const decoded = this.fastify.jwt.verify(token);
      const userId = decoded.id;
  
      console.log("New client connected:", decoded.email);
  
      // Store user connection
      connection.user = decoded;
      this.connectedUsers.set(userId, connection);
  
      // Send confirmation
      connection.send(
        JSON.stringify({
          type: "connected",
          userId,
        })
      );
  
      // Handle messages
      connection.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(connection, data);
        } catch (error) {
          console.error("Error handling message:", error);
          connection.send(
            JSON.stringify({
              type: "error",
              message: "Failed to process message",
            })
          );
        }
      });
  
      // Handle disconnection
      connection.on("close", () => {
        console.log("Client disconnected:", decoded.email);
        this.connectedUsers.delete(userId);
      });
    } catch (error) {
      console.error("Authentication error:", error);
      connection.send(
        JSON.stringify({ type: "error", message: "Authentication failed" })
      );
      connection.close();
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
    this.connectedUsers.forEach((connection) => {
      connection.socket.send(JSON.stringify({ event, data }));
    });
  }
}
