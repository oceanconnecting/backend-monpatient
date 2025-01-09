import { PrismaClient } from '@prisma/client'
import { AuthService } from './auth.service.js'

const prisma = new PrismaClient()

export class AdminService {
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            location: true,
            contactInfo: true
          }
        },
        nurse: {
          select: {
            id: true,
            name: true,
            availability: true,
            rating: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true
          }
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return users.map(user => {
      // Get the role-specific data
      const roleData = user[user.role.toLowerCase()]
      // Remove all role fields
      const { patient, nurse, doctor, pharmacy, admin, ...baseUser } = user
      // Return combined data
      return {
        ...baseUser,
        ...roleData
      }
    })
  }

  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            location: true,
            contactInfo: true
          }
        },
        nurse: {
          select: {
            id: true,
            name: true,
            availability: true,
            rating: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true
          }
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Get the role-specific data
    const roleSpecificData = user[user.role.toLowerCase()]
    // Remove all role fields
    const { patient, nurse, doctor, pharmacy, admin, ...baseUser } = user
    // Return combined data
    return {
      ...baseUser,
      ...roleSpecificData
    }
  }

  static async updateUser(id, userData) {
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true
      }
    })

    if (!existingUser) {
      throw new Error('User not found')
    }

    // Prepare update data
    const updateData = {
      email: userData.email,
      ...(userData.password && {
        password: await AuthService.hashPassword(userData.password)
      })
    }

    // Prepare role-specific update
    const roleModel = existingUser.role.toLowerCase()
    const roleUpdateData = {
      name: userData.name,
      ...(roleModel === 'patient' && {
        location: userData.location,
        contactInfo: userData.contactInfo
      }),
      ...(roleModel === 'doctor' && {
        specialization: userData.specialization
      }),
      ...(roleModel === 'pharmacy' && {
        location: userData.location
      }),
      ...(roleModel === 'nurse' && {
        availability: userData.availability
      })
    }

    // Update both user and role data
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        [roleModel]: {
          update: roleUpdateData
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            name: true,
            location: true,
            contactInfo: true
          }
        },
        nurse: {
          select: {
            id: true,
            name: true,
            availability: true,
            rating: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true
          }
        },
        pharmacy: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        admin: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get the role-specific data
    const roleSpecificData = updatedUser[updatedUser.role.toLowerCase()]
    // Remove all role fields
    const { patient, nurse, doctor, pharmacy, admin, ...baseUser } = updatedUser
    // Return combined data
    return {
      ...baseUser,
      ...roleSpecificData
    }
  }

  static async deleteUser(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Delete the user (this will cascade delete role-specific data)
    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    return { message: 'User deleted successfully' }
  }
}
