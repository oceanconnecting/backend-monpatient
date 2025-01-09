import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class AuthService {
  static async hashPassword(password) {
    return bcrypt.hash(password, 10)
  }

  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash)
  }

  static async register(userData) {
    const hashedPassword = await this.hashPassword(userData.password)
    
    const roleData = {
      name: userData.name,
      ...(userData.role === 'PATIENT' && {
        location: userData.location,
        contactInfo: userData.contactInfo,
      }),
      ...(userData.role === 'DOCTOR' && {
        specialization: userData.specialization,
      }),
      ...(userData.role === 'PHARMACY' && {
        location: userData.location,
      }),
      ...(userData.role === 'NURSE' && {
        availability: true,
        rating: 0,
      }),
      ...(userData.role === 'ADMIN' && {
        name: userData.name
      })
    }
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
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

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
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

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }
}