import { PrismaClient } from "@prisma/client";

export class ChatServicePatientNurseDoctor {
  constructor(fastify) {
    this.fastify = fastify;
    this.prisma = new PrismaClient();
    this.connectedUsers = new Map();
    this.rooms = new Map();
  }

  async handleConnection(connection, req) {
    try {
      // Extract token from query parameter
      const token = req.query.token;
      if (!token) {
        connection.socket.send(
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
      connection.socket.send(
        JSON.stringify({
          type: "connected",
          userId,
        })
      );

      // Handle messages
      connection.socket.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(connection, data);
        } catch (error) {
          console.error("Error handling message:", error);
          connection.socket.send(
            JSON.stringify({
              type: "error",
              message: "Failed to process message",
            })
          );
        }
      });

      // Handle disconnection
      connection.socket.on("close", () => {
        console.log("Client disconnected:", decoded.email);
        this.connectedUsers.delete(userId);
      });
    } catch (error) {
      console.error("Authentication error:", error);
      connection.socket.send(
        JSON.stringify({ type: "error", message: "Authentication failed" })
      );
      connection.close();
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
        connection.socket.send(
          JSON.stringify({
            type: "error",
            message: "Unknown message type",
          })
        );
    }
  }

  async handleJoinRoom(connection, roomId) {
    const userId = connection.user.id;

    try {
      const canJoin = await this.canUserJoinRoom(userId, roomId);

      if (canJoin) {
        // Add user to room tracking
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(userId);

        // Send confirmation
        connection.socket.send(
          JSON.stringify({
            type: "room-joined",
            roomId,
          })
        );

        // Send room history
        const messages = await this.getRoomMessages(roomId, userId);
        connection.socket.send(
          JSON.stringify({
            type: "room-history",
            roomId,
            messages,
          })
        );
      } else {
        connection.socket.send(
          JSON.stringify({
            type: "error",
            message: "Cannot join room: unauthorized",
          })
        );
      }
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          message: "Failed to join room",
        })
      );
    }
  }

  async handleSendMessage(connection, roomId, userId, userRole, content) {
    try {
      const message = await this.sendMessage(roomId, userId, userRole, content);

      // Broadcast to room
      this.broadcastToRoom(roomId, {
        type: "new-message",
        roomId,
        message,
      });
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: "error",
          message: "Failed to send message: " + error.message,
        })
      );
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
        // WebSocket.OPEN
        connection.socket.send(message);
      }
    });
  }

  // Your existing methods remain the same...
  // canUserJoinRoom, createOrGetRoom, markMessagesAsRead, sendMessage, etc.
}
