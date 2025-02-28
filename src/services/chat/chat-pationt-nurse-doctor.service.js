import { PrismaClient } from "@prisma/client";

export class ChatServicePatientNurseDoctor {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = new PrismaClient();
    this.connectedUsers = new Map();
    this.rooms = new Map();
  }

  sendErrorAndClose(connection, message) {
    this.sendJson(connection, { type: "error", message });
    connection.close();
  }

  sendJson(connection, data) {
    connection.send(JSON.stringify(data));
  }

  sendRoomMessage(connection, type, roomId, additionalData = {}) {
    this.sendJson(connection, { type, roomId, ...additionalData });
  }

  async handleConnection(connection, req) {
    try {
      const token = req.query.token;
      if (!token) {
        this.sendErrorAndClose(connection, "No token provided");
        return;
      }

      const decoded = this.fastify.jwt.verify(token);
      const userId = decoded.id;

      console.log("New client connected:", decoded.email, decoded.role);

      connection.user = decoded;
      this.connectedUsers.set(userId, connection);

      this.sendJson(connection, { type: "connected", userId });

      connection.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(connection, data);
        } catch (error) {
          console.error("Error handling message:", error);
          this.sendJson(connection, {
            type: "error",
            message: "Failed to process message",
          });
        }
      });

      connection.on("close", () => {
        console.log("Client disconnected:", decoded.email);
        this.connectedUsers.delete(userId);
      });
    } catch (error) {
      console.error("Authentication error:", error);
      this.sendErrorAndClose(connection, "Authentication failed");
    }
  }

  async handleMessage(connection, data) {
    const userId = connection.user.id;
    const userRole = connection.user.role;

    switch (data.type) {
      case "join-room":
        await this.handleJoinRoom(connection, data.roomId);
        break;

      case "send-message":
        await this.handleSendMessage(
          connection,
          data.roomId,
          userId,
          userRole,
          data.content
        );
        break;

      case "typing":
        this.broadcastToRoom(
          data.roomId,
          {
            type: "user-typing",
            userId,
            roomId: data.roomId,
          },
          userId
        );
        break;

      case "mark-read":
        await this.markMessagesAsRead(data.roomId, userId);
        this.broadcastToRoom(data.roomId, {
          type: "messages-read",
          userId,
          roomId: data.roomId,
        });
        break;

      default:
        this.sendErrorAndClose(connection, "Unknown message type");
    }
  }

  async handleJoinRoom(connection, roomId) {
    const userId = connection.user.id;

    try {
      const canJoin = await this.canUserJoinRoom(userId, roomId);

      if (canJoin) {
        this.joinRoom(userId, roomId);
        this.sendRoomMessage(connection, "room-joined", roomId);

        const messages = await this.getRoomMessages(roomId, userId);
        this.sendRoomMessage(connection, "room-history", roomId, { messages });
      } else {
        this.sendRoomMessage(connection, "error", roomId, {
          message: "Cannot join room: unauthorized",
        });
      }
    } catch (error) {
      this.sendRoomMessage(connection, "error", roomId, {
        message: "Failed to join room",
      });
    }
  }

  joinRoom(userId, roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(userId);
  }

  async handleSendMessage(connection, roomId, userId, userRole, content) {
    try {
      const message = await this.sendMessage(roomId, userId, userRole, content);
      this.broadcastToRoom(roomId, {
        type: "new-message",
        roomId,
        message,
      });
    } catch (error) {
      this.sendJson(connection, {
        type: "error",
        message: "Failed to send message: " + error.message,
      });
    }
  }

  broadcastToRoom(roomId, data, excludeUserId = null) {
    const roomUsers = this.rooms.get(roomId);
    if (!roomUsers) return;

    const message = JSON.stringify(data);

    roomUsers.forEach((userId) => {
      if (excludeUserId && userId === excludeUserId) return;

      const connection = this.connectedUsers.get(userId);
      if (connection && connection.socket.readyState === 1) {
        connection.socket.send(message);
      }
    });
  }

  // Your existing methods remain the same...
  // canUserJoinRoom, createOrGetRoom, markMessagesAsRead, sendMessage, etc.
}