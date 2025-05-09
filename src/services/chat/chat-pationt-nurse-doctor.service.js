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
    }catch (error) {
      console.error("Error joining room:", error);
      this.sendRoomMessage(connection, "error", roomId, {
          message: "Failed to join room"
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
  async canUserJoinRoom(userId, roomId) {
    const room = await this.prisma.chatRoomPatientNurse.findUnique({
      where: { id: parseInt(roomId) },
      include: {
        patient: {
          include: { user: true },
        },
        nurse: {
          include: { user: true },
        },
      },
    });

    if (!room) return false;

    return room.patient.user.id === userId || room.nurse.user.id === userId;
  }

  async createOrGetRoom(patientId, nurseId) {
    // Check if a room already exists between the patient and nurse
    let room = await this.prisma.chatRoomPatientNurse.findFirst({
      where: {
        patientId: parseInt(patientId),
        nurseId: parseInt(nurseId),
      },
    });

    if (!room) {
      // Create a new room if it doesn't exist
      room = await this.prisma.chatRoomPatientNurse.create({
        data: {
          patientId: parseInt(patientId),
          nurseId: parseInt(nurseId),
          status: 'ACTIVE',
        },
        include: {
          patient: true,
          nurse: true,
        },
      });
    }

    return room;
  }

  async markMessagesAsRead(roomId, userId) {
    await this.prisma.message.updateMany({
      where: {
        chatRoomPatientNurseId: parseInt(roomId),
        senderId: { not: parseInt(userId) },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
  
  async sendMessage(roomId, senderId, senderRole, content) {
    // Validate sender role
    if (senderRole !== 'PATIENT' && senderRole !== 'NURSE') {
      throw new Error('Invalid sender role');
    }
    // Get the sender's profile
    const sender = await this.prisma.user.findUnique({
      where: { id: parseInt(senderId) },
      include: {
        patient: true,
        nurse: true,
      },
    });
  
    if (!sender) {
      throw new Error('Sender not found');
    }
  
    // Check if the sender has the correct profile
    const profileId = senderRole === 'PATIENT' ? sender.patient?.id : sender.nurse?.id;
    if (!profileId) {
      throw new Error(`Sender is not a ${senderRole}`);
    }
  
    // Verify that the sender is part of the chat room
    const room = await this.prisma.chatRoomPatientNurse.findFirst({
      where: {
        id: parseInt(roomId),
        OR: [
          { patientId: senderRole === 'PATIENT' ? profileId : undefined },
          { nurseId: senderRole === 'NURSE' ? profileId : undefined },
        ],
      },
    });
  
    if (!room) {
      throw new Error('Chat room not found or user not authorized');
    }
  
    // Create the message
    const message = await this.prisma.message.create({
      data: {
        content,
        isRead: false,
        senderRole,
        senderId: parseInt(senderId),
        chatRoomPatientNurse: {
          connect: {
            id: parseInt(roomId),
          },
        },
      },
      include: {
        chatRoomPatientNurse: true,
      },
    });
  
    return message;
  }

  async getRoomMessages(roomId, userId) {
    // Check if the user has access to the room
    const room = await this.prisma.chatRoomPatientNurse.findFirst({
      where: {
        id: parseInt(roomId),
        OR: [
          { patient: { user: { id: parseInt(userId) } } },
          { nurse: { user: { id: parseInt(userId) } } },
        ],
      },
    });

    if (!room) {
      throw new Error('Chat room not found or user not authorized');
    }

    // Get messages for the room
    const messages = await this.prisma.message.findMany({
      where: {
        chatRoomPatientNurseId: parseInt(roomId),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  }
  
  async getUserRooms(userId, userRole) {
    const query = {
      where: {},
    };

    if (userRole === 'PATIENT') {
      query.where.patient = {
        user: {
          id: parseInt(userId),
        },
      };
    } else if (userRole === 'NURSE') {
      query.where.nurse = {
        user: {
          id: parseInt(userId),
        },
      };
    } else {
      throw new Error('Invalid user role');
    }

    return this.prisma.chatRoomPatientNurse.findMany({
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
        nurse: {
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
            createdAt: 'asc',
          },
        },
      },
    });
  }
}