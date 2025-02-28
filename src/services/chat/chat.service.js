import { PrismaClient } from "@prisma/client";

export class ChatService {
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
    this.sendJson(connection, { event: "error", message });
  }

  // Helper method to validate room access
  async validateRoomAccess(userId, roomId) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    if (!room) throw new Error("Room not found");
    if (room.patient.user.id !== userId && room.doctor.user.id !== userId) {
      throw new Error("User not authorized to access this room");
    }
    return room;
  }

  // Helper method to broadcast messages
  broadcast(clients, data, excludeUserId = null) {
    clients.forEach((connection, userId) => {
      if (excludeUserId && userId === excludeUserId) return;
      if (connection.socket.readyState === connection.socket.OPEN) {
        this.sendJson(connection.socket, data);
      }
    });
  }

  async handleConnection(connection, req) {
    try {
      // Extract token from query parameter
      const token = req.query.token;
      if (!token) {
        this.handleError(connection, "No token provided");
        connection.close();
        return;
      }

      // Verify token
      const decoded = this.fastify.jwt.verify(token);
      const userId = decoded.id;

      console.log("New client connected:", decoded.email, decoded.role);

      // Store user connection
      connection.user = decoded;
      this.connectedUsers.set(userId, connection);

      // Send confirmation
      this.sendJson(connection, { type: "connected", userId });

      // Handle messages
      connection.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await connection.close();
          this.sendJson(connection, {
            type: "success",
            message: "Message processed successfully",
            data,
          });
        } catch (error) {
          console.error("Error handling message:", error);
          this.handleError(connection, "Failed to process message");
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
      connection.close();
    }
  }

  async handleJoinRoom(connection, roomId) {
    const userId = connection.user.id;
    console.log(`User ${userId} joining room ${roomId}`);

    try {
      await this.validateRoomAccess(userId, roomId);

      // Store room information with the connection
      if (!connection.rooms) connection.rooms = new Set();
      connection.rooms.add(`room:${roomId}`);

      console.log(`User ${userId} joined room ${roomId}`);
      this.sendJson(connection.socket, {
        event: "room-joined",
        roomId: roomId,
      });
    } catch (error) {
      this.handleError(connection.socket, "Cannot join room: not authorized");
    }
  }

  async handleSendMessage(connection, data) {
    const userId = connection.user.id;
    console.log(`New message from ${userId} in room ${data.roomId}:`, data.content);

    try {
      const message = await this.sendMessage(
        data.roomId,
        userId,
        connection.user.role,
        data.content
      );

      // Broadcast to all users in the room
      this.broadcastToRoom(data.roomId, {
        event: "new-message",
        message: message,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      this.handleError(connection.socket, "Failed to send message: " + error.message);
    }
  }

  handleTyping(connection, roomId) {
    const userId = connection.user.id;

    // Broadcast typing status to other users in the room
    this.broadcastToRoom(
      roomId,
      {
        event: "user-typing",
        userId: userId,
        roomId: roomId,
      },
      userId
    ); // Exclude the sender
  }

  async handleMarkRead(connection, roomId) {
    const userId = connection.user.id;

    try {
      await this.markMessagesAsRead(roomId, userId);

      // Broadcast read status to all users in the room
      this.broadcastToRoom(roomId, {
        event: "messages-read",
        userId: userId,
        roomId: roomId,
      });
    } catch (error) {
      this.handleError(connection.socket, error.message);
    }
  }

  broadcastToRoom(roomId, data, excludeUserId = null) {
    const roomKey = `room:${roomId}`;
    const clients = Array.from(this.connectedUsers).filter(([_, connection]) =>
      connection.rooms?.has(roomKey)
    );
    this.broadcast(clients, data, excludeUserId);
  }

  broadcastToAllClients(data) {
    this.broadcast(Array.from(this.connectedUsers), data);
  }

  async canUserJoinRoom(userId, roomId) {
    try {
      await this.validateRoomAccess(userId, roomId);
      return true;
    } catch (error) {
      return false;
    }
  }

  async createOrGetRoom(patientId, participantId, participantRole) {
    // Get the participant's profile ID
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
      include: {
        doctor: participantRole === "DOCTOR",
      },
    });

    if (!participant) {
      throw new Error("Participant not found");
    }

    const profileId = participant.doctor?.id;
    if (!profileId) {
      throw new Error(`Participant is not a ${participantRole}`);
    }

    const where = {
      patientId: patientId,
      doctorId: profileId,
    };
    let room = await this.prisma.chatRoom.findFirst({ where });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          ...where,
          status: "ACTIVE",
        },
        include: {
          patient: true,
          doctor: true,
        },
      });
    }
    return room;
  }

  async sendMessage(roomId, senderId, senderRole, content) {
    // Get the sender's profile ID
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!sender) {
      throw new Error("Sender not found");
    }

    const profileId =
      senderRole === "PATIENT" ? sender.patient?.id : sender.doctor?.id;
    if (!profileId) {
      throw new Error(`Sender is not a ${senderRole}`);
    }

    const room = await this.validateRoomAccess(senderId, roomId);

    const message = await this.prisma.message.create({
      data: {
        content,
        isRead: false,
        senderRole,
        senderId: senderId,
        chatRoom: {
          connect: {
            id: roomId,
          },
        },
      },
      include: {
        chatRoom: true,
      },
    });

    return message;
  }

  async markMessagesAsRead(roomId, userId) {
    await this.prisma.message.updateMany({
      where: {
        roomId: roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async getRoomMessages(roomId, userId) {
    await this.validateRoomAccess(userId, roomId);

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: {
        chatRoomId: roomId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return messages;
  }

  async getUserRooms(userId, userRole) {
    const query = {
      where: {},
    };

    if (userRole === "PATIENT") {
      query.where.patient = {
        user: {
          id: userId,
        },
      };
    } else if (userRole === "DOCTOR") {
      query.where.doctor = {
        user: {
          id: userId,
        },
      };
    }

    return this.prisma.chatRoom.findMany({
      ...query,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }
}