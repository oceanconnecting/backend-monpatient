import { PrismaClient } from '@prisma/client';
export class ChatServicePatientNurse {
  constructor(io) {
    this.io = io;
    this.prisma = new PrismaClient();
    this.connectedUsers = new Map();

    if (io) {
      this.fastify = io.fastify; // Get Fastify instance from Socket.IO
      io.use(this.authenticateSocket.bind(this));
      io.on('connection', this.handleConnection.bind(this));
    }
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new Error('No token provided');

      const decoded = this.fastify.jwt.verify(token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  } 
    handleConnection(socket) {
    console.log('New client connected:', socket.user.email);
    const userId = socket.user.id;
    this.connectedUsers.set(userId, socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle joining chat rooms
    socket.on('join-room', async (roomId) => {
      console.log(`User ${userId} joining room ${roomId}`);
      const canJoin = await this.canUserJoinRoom(userId, roomId);
      if (canJoin) {
        socket.join(`room:${roomId}`);
        console.log(`User ${userId} joined room ${roomId}`);
      }
    });

    // Handle new messages
    socket.on('send-message', async (data) => {
      console.log(`New message from ${userId} in room ${data.roomId}:`, data.content);
      try {
        const message = await this.sendMessage(
          data.roomId,
          userId,
          socket.user.role,
          data.content
        );
        this.io.to(`room:${data.roomId}`).emit('new-message', message);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('typing', (roomId) => {
      socket.to(`room:${roomId}`).emit('user-typing', {
        userId,
        roomId,
      });
    });

    // Handle read receipts
    socket.on('mark-read', async (roomId) => {
      try {
        await this.markMessagesAsRead(roomId, userId);
        this.io.to(`room:${roomId}`).emit('messages-read', { userId, roomId });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.user.email);
      this.connectedUsers.delete(userId);
    });
    }
  async canUserJoinRoom(userId, roomId) {
    const room = await this.prisma.chatRoomPatientNurse.findUnique({
      where: { id: roomId },
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
        patientId,
        nurseId,
      },
    });

    if (!room) {
      // Create a new room if it doesn't exist
      room = await this.prisma.chatRoomPatientNurse.create({
        data: {
          patientId,
          nurseId,
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
        chatRoomPatientNurseId: roomId,
        senderId: { not: userId },
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
      where: { id: senderId },
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
        id: roomId,
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
        senderId,
        chatRoomPatientNurse: {
          connect: {
            id: roomId,
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
        id: roomId,
        OR: [
          { patient: { user: { id: userId } } },
          { nurse: { user: { id: userId } } },
        ],
      },
    });

    if (!room) {
      throw new Error('Chat room not found or user not authorized');
    }

    // Get messages for the room
    const messages = await this.prisma.message.findMany({
      where: {
        chatRoomPatientNurseId: roomId,
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
          id: userId,
        },
      };
    } else if (userRole === 'NURSE') {
      query.where.nurse = {
        user: {
          id: userId,
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