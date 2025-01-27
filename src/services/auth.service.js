import bcryptjs from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()
const generateToken = () => crypto.randomBytes(20).toString('hex')
export class AuthService {

 constructor(mailer) {
    this.mailer = mailer
  }

  async hashPassword(password) {
    return bcryptjs.hash(password, 10)
  }

  async verifyPassword(password, hash) {
    return bcryptjs.compare(password, hash)
  }

  formatUserResponse(user) {
    const { password: _, ...userBase } = user
    const roleData = user[user.role.toLowerCase()]
    
    return {
      ...userBase,
      profile: roleData
    }
  }

   static validateUserInput(userData) {
    // Required fields validation
    const requiredFields = ['email', 'firstname', 'lastname', 'password', 'role']
    const missingFields = requiredFields.filter(field => !userData[field])
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format')
    }

    // Password strength validation (min 8 chars, 1 number, 1 uppercase)
    const passwordRegex = /^(?=.*\d)(?=.*[A-Z]).{8,}$/
    if (userData.role !== 'ADMIN' && !passwordRegex.test(userData.password)) {
      throw new Error('Password must be at least 8 characters with 1 number and 1 uppercase letter')
    }

    // Role validation
    const validRoles = ['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN']
    if (!validRoles.includes(userData.role)) {
      throw new Error('Invalid user role')
    }

    // Role-specific field validation
    if (userData.role === 'DOCTOR' && !userData.specialization) {
      throw new Error('Specialization is required for doctors')
    }
  }

  async register(userData) {
    this.validateUserInput(userData)

    const hashedPassword = await this.hashPassword(userData.password)
    
    let verificationData = {}
    if (userData.role !== 'ADMIN') {
      verificationData = {
        isEmailVerified: false,
        emailVerificationToken: generateToken(),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    } else {
      verificationData = { isEmailVerified: true }
    }

    const roleData = this.getRoleSpecificData(userData)

    try {
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          firstname: userData.firstname,
          lastname: userData.lastname,
          role: userData.role,
          ...verificationData,
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

      if (userData.role !== 'ADMIN') {
        await this.sendVerificationEmail(
          user.email, 
          user.emailVerificationToken
        )
      }

      return this.formatUserResponse(user)
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('Email already exists')
      }
      throw new Error('Registration failed')
    }
  }

  async sendVerificationEmail(email, token) {
    try {
      await this.mailer.sendMail({
        from: 'noreply@yourdomain.com',
        to: email,
        subject: 'Verify Your Email',
        text: `Verification token: ${token}\n\nUse this token to verify your account.`,
        html: `
          <h1>Email Verification</h1>
          <p>Use this token to verify your account:</p>
          <strong>${token}</strong>
          <p>Or click the link below:</p>
          <a href="http://yourdomain.com/verify-email?token=${token}">
            Verify Email
          </a>
        `
      })
    } catch (error) {
      console.error('Failed to send verification email:', error)
      throw new Error('Failed to send verification email')
    }
  }


  static getRoleSpecificData(userData) {
    return {
      ...(userData.role === 'PATIENT' && {}),
      ...(userData.role === 'DOCTOR' && {
        specialization: userData.specialization,
      }),
      ...(userData.role === 'PHARMACY' && {}),
      ...(userData.role === 'NURSE' && {
        availability: true,
        rating: 0
      }),
      ...(userData.role === 'ADMIN' && {})
    }
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