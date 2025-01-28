import { PrismaClient } from '@prisma/client'
import { AuthService } from './auth.service.js'

const prisma = new PrismaClient()

export class AdminService {
   //users
   static async getAllUsers() {
   const users = await prisma.user.findMany({
    where: {
    role: 'ADMIN'
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      patient: {
        select: {
          name: true,
        }
      },
      nurse: {
        select: {
          name: true,
          availability: true,
          rating: true
        }
      },
      doctor: {
        select: {
          name: true,
          specialization: true
        }
      },
      pharmacy: {
        select: {
          name: true,
          location: true
        }
      },
      admin: {
        select: {
         
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
    if (!id || isNaN(parseInt(id))) {
      throw new Error('Invalid user ID')
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id),role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            name: true,
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
      const error = new Error('User not found')
      error.code = 'P2001'
      throw error
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
      where: { id: parseInt(id),role: 'ADMIN' },
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
        name: userData.name,
      }),
      ...(roleModel === 'doctor' && {
        specialization: userData.specialization
      }),
      ...(roleModel === 'pharmacy' && {
        location: userData.location
      }),
      ...(roleModel === 'nurse' && {
        availability: userData.availability
      }),
      ...(roleModel === 'admin' && {
        name: userData.name
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
      where: { id: parseInt(id),role: 'ADMIN' },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true
      }
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
   static async createUser(data){
      return await prisma.user.create({
        data
      })
   }
    //admins
   static async getAllAdmins() {
    const users = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      include: {
        admin: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    return users.map(user => ({
      id: user.id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
   } 
   static async updateAdminById(id, data) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('Invalid admin ID')
  }
  const admin = await prisma.user.findUnique({
    where: { id: parseInt(id),role: 'ADMIN' }
  })

  if (!admin) {
    throw new Error('Admin not found')
  }
    return await prisma.admin.update({
      where: { id: parseInt(id) },
      data
    })
   }
   static async deleteAdmin(id) { 
    const admin = await prisma.user.findFirst({
      where: { id: parseInt(id), role: 'ADMIN' },
      include: {
        admin: true
      }
    })
  
    if (!admin) {
      throw new Error('Admin not found')
    }
  
    // Delete the admin (this will cascade delete role-specific data)
    await prisma.user.delete({
      where: { id: parseInt(id),role: 'ADMIN' }
    })
    return { message: 'Admin deleted successfully' }
   }
   static async getAdminByid(id){ 
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const admin =await  prisma.user.findFirst({
      where: { id: parseInt(id),role: 'ADMIN' },
      include: {
        admin: true
      }
    })
    return admin
   }

}
