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

  // Helper method to handle user connection
  async handleConnection(connection, req) {
    try {
      const token = req.query.token;
      if (!token) {
        this.handleError(connection, "No token provided");
        connection.close();
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
          this.handleError(connection, "Failed to process message");
        }
      });

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

  // Helper method to handle incoming messages
  async handleMessage(connection, data) {
    const userId = connection.user.id;

    switch (data.type) {
      case "join-room":
        await this.handleJoinRoom(connection, data.roomId);
        break;

      case "send-message":
        await this.handleSendMessage(connection, data);
        break;

      case "typing":
        this.handleTyping(connection, data.roomId);
        break;

      case "mark-read":
        await this.handleMarkRead(connection, data.roomId);
        break;

      default:
        this.handleError(connection, "Unknown message type");
    }
  }

  // Helper method to handle joining a room
  async handleJoinRoom(connection, roomId) {
    const userId = connection.user.id;
    console.log(`User ${userId} joining room ${roomId}`);

    try {
      await this.validateRoomAccess(userId, roomId);

      if (!connection.rooms) connection.rooms = new Set();
      connection.rooms.add(`room:${roomId}`);

      console.log(`User ${userId} joined room ${roomId}`);
      this.sendJson(connection.socket, { event: "room-joined", roomId });
    } catch (error) {
      this.handleError(connection.socket, "Cannot join room: not authorized");
    }
  }

  // Helper method to handle sending a message
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

      this.broadcastToRoom(data.roomId, { event: "new-message", message });
    } catch (error) {
      console.error("Error sending message:", error);
      this.handleError(connection.socket, "Failed to send message: " + error.message);
    }
  }

  // Helper method to handle typing status
  handleTyping(connection, roomId) {
    const userId = connection.user.id;
    this.broadcastToRoom(
      roomId,
      { event: "user-typing", userId, roomId },
      userId
    );
  }

  // Helper method to handle marking messages as read
  async handleMarkRead(connection, roomId) {
    const userId = connection.user.id;

    try {
      await this.markMessagesAsRead(roomId, userId);
      this.broadcastToRoom(roomId, { event: "messages-read", userId, roomId });
    } catch (error) {
      this.handleError(connection.socket, error.message);
    }
  }

  // Helper method to broadcast to a specific room
  broadcastToRoom(roomId, data, excludeUserId = null) {
    const roomKey = `room:${roomId}`;
    const clients = Array.from(this.connectedUsers).filter(([_, connection]) =>
      connection.rooms?.has(roomKey)
    );
    this.broadcast(clients, data, excludeUserId);
  }

  // Helper method to create or get a room
  async createOrGetRoom(patientId, participantId, participantRole) {
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
      include: { doctor: participantRole === "DOCTOR" },
    });

    if (!participant) throw new Error("Participant not found");

    const profileId = participant.doctor?.id;
    if (!profileId) throw new Error(`Participant is not a ${participantRole}`);

    const where = { patientId, doctorId: profileId };
    let room = await this.prisma.chatRoom.findFirst({ where });

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { ...where, status: "ACTIVE" },
        include: { patient: true, doctor: true },
      });
    }
    return room;
  }

  // Helper method to send a message
  async sendMessage(roomId, senderId, senderRole, content) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: { patient: true, doctor: true },
    });

    if (!sender) throw new Error("Sender not found");

    const profileId =
      senderRole === "PATIENT" ? sender.patient?.id : sender.doctor?.id;
    if (!profileId) throw new Error(`Sender is not a ${senderRole}`);

    await this.validateRoomAccess(senderId, roomId);

    return this.prisma.message.create({
      data: {
        content,
        isRead: false,
        senderRole,
        senderId,
        chatRoom: { connect: { id: roomId } },
      },
      include: { chatRoom: true },
    });
  }

  // Helper method to mark messages as read
  async markMessagesAsRead(roomId, userId) {
    await this.prisma.message.updateMany({
      where: { roomId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Helper method to get room messages
  async getRoomMessages(roomId, userId) {
    await this.validateRoomAccess(userId, roomId);
    return this.prisma.message.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: "asc" },
    });
  }

  // Helper method to get user rooms
  async getUserRooms(userId, userRole) {
    const query = {
      where: {
        [userRole.toLowerCase()]: { user: { id: userId } },
      },
    };

    return this.prisma.chatRoom.findMany({
      ...query,
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
  }
}