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
      where: { id: parseInt(roomId) },
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
    const where = {
      patientId: parseInt(patientId),
      ...(participantRole === 'DOCTOR' 
        ? { doctorId: parseInt(participantId) }
        : { nurseId: parseInt(participantId) }
      )
    }
    let room = await this.prisma.chatRoom.findFirst({ where })

    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: where,
        include: {
          patient: true,
          doctor: true,
          nurse: true
        }
      })
    }

    return room
  }

  async sendMessage(roomId, senderId, senderRole, content) {
    const room = await this.prisma.chatRoom.findUnique({
      where: {
        id: parseInt(roomId),
        OR: [
          { patientId: parseInt(senderId) },
          { doctorId: parseInt(senderId) },
          { nurseId: parseInt(senderId) }
        ]
      }
    })

    if (!room) {
      throw new Error('Chat room not found or user not authorized')
    }

    const message = await this.prisma.message.create({
      data: {
        roomId: parseInt(roomId),
        senderId: parseInt(senderId),
        senderRole,
        content
      },
      include: {
        room: {
          include: {
            patient: { select: { name: true } },
            doctor: { select: { name: true } },
            nurse: { select: { name: true } }
          }
        }
      }
    })

    // Update room's last message timestamp
    await this.prisma.chatRoom.update({
      where: { id: parseInt(roomId) },
      data: { lastMessageAt: new Date() }
    })

    return message
  }

  async markMessagesAsRead(roomId, userId) {
    await this.prisma.message.updateMany({
      where: {
        roomId: parseInt(roomId),
        senderId: { not: parseInt(userId) },
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })
  }

  async getRoomMessages(roomId, userId) {
    const canJoin = await this.canUserJoinRoom(userId, roomId)
    if (!canJoin) {
      throw new Error('Unauthorized to access this chat room')
    }

    return this.prisma.message.findMany({
      where: {
        roomId: parseInt(roomId)
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
  }

  
  async getUserRooms(userId, userRole) {
    const query = {
      where: {}
    }

    if (userRole === 'PATIENT') {
      query.where.patient = {
        user: {
          id: parseInt(userId)
        }
      }
    } else if (userRole === 'DOCTOR') {
      query.where.doctor = {
        user: {
          id: parseInt(userId)
        }
      }
    }

    return this.prisma.chatRoom.findMany({
      ...query,
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    })
  }
}
