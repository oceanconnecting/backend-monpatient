import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export class ChatService {
  constructor(io) {
    this.io = io
    this.connectedUsers = new Map()
    
    io.use(this.authenticateSocket.bind(this))
    io.on('connection', this.handleConnection.bind(this))
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token
      if (!token) throw new Error('No token provided')

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
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
        socket.emit('error', { message: error.message })
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
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: parseInt(roomId),
        OR: [
          { patientId: parseInt(userId) },
          { doctorId: parseInt(userId) },
          { nurseId: parseInt(userId) }
        ]
      }
    })
    return !!room
  }

  async createOrGetRoom(patientId, participantId, participantRole) {
    const where = {
      patientId: parseInt(patientId),
      ...(participantRole === 'DOCTOR' 
        ? { doctorId: parseInt(participantId) }
        : { nurseId: parseInt(participantId) }
      )
    }

    let room = await prisma.chatRoom.findFirst({ where })

    if (!room) {
      room = await prisma.chatRoom.create({
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
    const room = await prisma.chatRoom.findFirst({
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

    const message = await prisma.message.create({
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
    await prisma.chatRoom.update({
      where: { id: parseInt(roomId) },
      data: { lastMessageAt: new Date() }
    })

    return message
  }

  async markMessagesAsRead(roomId, userId) {
    await prisma.message.updateMany({
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
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: parseInt(roomId),
        OR: [
          { patientId: parseInt(userId) },
          { doctorId: parseInt(userId) },
          { nurseId: parseInt(userId) }
        ]
      }
    })

    if (!room) {
      throw new Error('Chat room not found or user not authorized')
    }

    return prisma.message.findMany({
      where: { roomId: parseInt(roomId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
  }

  async getUserRooms(userId, userRole) {
    const where = userRole === 'PATIENT'
      ? { patientId: parseInt(userId) }
      : userRole === 'DOCTOR'
        ? { doctorId: parseInt(userId) }
        : { nurseId: parseInt(userId) }

    return prisma.chatRoom.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
        nurse: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            room: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })
  }
}
