import { PrismaClient } from '@prisma/client'

export class ChatService {
  constructor(io) {
    this.io = io
    this.prisma = new PrismaClient()
    this.connectedUsers = new Map()

    if (io) {
      this.fastify = io.fastify // Get fastify instance from Socket.IO
      io.use(this.authenticateSocket.bind(this))
      io.on('connection', this.handleConnection.bind(this))
    }
  }
  
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token
      if (!token) throw new Error('No token provided')

      const decoded = this.fastify.jwt.verify(token)
      socket.user = decoded
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  }
   handleConnection(socket) {
    console.log('New client connected:', socket.user.email)
    const userId = socket.user.id
    this.connectedUsers.set(userId, socket.id)

    // Join user-specific room
    socket.join(`user:${userId}`)

    // Handle joining chat rooms
    socket.on('join-room', async (roomId) => {
      console.log(`User ${userId} joining room ${roomId}`)
      const canJoin = await this.canUserJoinRoom(userId, roomId)
      if (canJoin) {
        socket.join(`room:${roomId}`)
        console.log(`User ${userId} joined room ${roomId}`)
      }
    })

    // Handle new messages
    socket.on('send-message', async (data) => {
      console.log(`New message from ${userId} in room ${data.roomId}:`, data.content)
      try {
        const message = await this.sendMessage(
          data.roomId,
          userId,
          socket.user.role,
          data.content
        )
        this.io.to(`room:${data.roomId}`).emit('new-message', message)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Handle typing status
    socket.on('typing', (roomId) => {
      socket.to(`room:${roomId}`).emit('user-typing', {
        userId,
        roomId
      })
    })

    // Handle read receipts
    socket.on('mark-read', async (roomId) => {
      try {
        await this.markMessagesAsRead(roomId, userId)
        this.io.to(`room:${roomId}`).emit('messages-read', { userId, roomId })
      } catch (error) {
        socket.emit('error', { message: error.message })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.user.email)
      this.connectedUsers.delete(userId)
    })
  }

  async canUserJoinRoom(userId, roomId) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    })

    if (!room) return false

    return room.patient.user.id === userId || room.doctor.user.id === userId
  }

  async createOrGetRoom(patientId, participantId, participantRole) {
    // Get the participant's profile ID
    const participant = await this.prisma.user.findUnique({
      where: { id: participantId },
      include: {
        doctor: participantRole === 'DOCTOR' ? true : false
      }
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const profileId = participant.doctor?.id;
    if (!profileId) {
      throw new Error(`Participant is not a ${participantRole}`);
    }

    const where = {
      patientId: patientId,
      doctorId: profileId
    }
    let room = await this.prisma.chatRoom.findFirst({ where })

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          ...where,
          status: 'ACTIVE'
        },
        include: {
          patient: true,
          doctor: true
        }
      })
    }
    return room
  }

  async sendMessage(roomId, senderId, senderRole, content) {
    // Get the sender's profile ID
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!sender) {
      throw new Error('Sender not found');
    }

    const profileId = senderRole === 'PATIENT' ? sender.patient?.id : sender.doctor?.id;
    if (!profileId) {
      throw new Error(`Sender is not a ${senderRole}`);
    }

    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        OR: [
          { patientId: profileId },
          { doctorId: profileId }
        ]
      }
    })

    if (!room) {
      throw new Error('Chat room not found or user not authorized')
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        isRead: false,
        senderRole,
        senderId: senderId,
        chatRoom: {
          connect: {
            id: roomId
          }
        }
      },
      include: {
        chatRoom: true
      }
    })

    return message
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
        readAt: new Date()
      }
    })
  }

  async getRoomMessages(roomId, userId) {
    // Get the user's profile
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const profileId = user.patient?.id || user.doctor?.id;
    if (!profileId) {
      throw new Error('User profile not found');
    }

    // Check if user has access to the room
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        OR: [
          { patientId: profileId },
          { doctorId: profileId }
        ]
      }
    });

    if (!room) {
      throw new Error('Chat room not found or user not authorized');
    }

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: {
        chatRoomId: roomId
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return messages;
  }

  async getUserRooms(userId, userRole) {
    const query = {
      where: {}
    }

    if (userRole === 'PATIENT') {
      query.where.patient = {
        user: {
          id: userId
        }
      }
    } else if (userRole === 'DOCTOR') {
      query.where.doctor = {
        user: {
          id: userId
        }
      }
    }

    return this.prisma.chatRoom.findMany({
      ...query,
      include: {
        patient: {
          include: { user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
          } }
        },
        doctor: {
          include: { user:{
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true
            }
          }}
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })
  }
}
