import bcryptjs from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class AuthService {
  static async hashPassword(password) {
    return bcryptjs.hash(password, 10)
  }

  static async verifyPassword(password, hash) {
    return bcryptjs.compare(password, hash)
  }

  static formatUserResponse(user) {
    const { password: _, ...userBase } = user
    const roleData = user[user.role.toLowerCase()]
    
    return {
      ...userBase,
      profile: roleData
    }
  }
  static async register(userData) {
    const hashedPassword = await this.hashPassword(userData.password)
    
    const roleData = {
     
      ...(userData.role === 'PATIENT' && {
      }),
      ...(userData.role === 'DOCTOR' && {
        specialization: userData.specialization,
     
      }),
      ...(userData.role === 'PHARMACY' && {
      
      }),
      ...(userData.role === 'NURSE' && {
        availability: true,
        rating: 0
      }),
      ...(userData.role === 'ADMIN' && {
      
      })
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        firstname: userData.firstname,
        lastname: userData.lastname,
        role: userData.role,
        [userData.role.toLowerCase()]: {
          create: roleData
        }
      },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true,
      },
    })

    return this.formatUserResponse(user)
  }

  static async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true,
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const validPassword = await this.verifyPassword(password, user.password)
    if (!validPassword) {
      throw new Error('Invalid password')
    }

    return this.formatUserResponse(user)
  }
}