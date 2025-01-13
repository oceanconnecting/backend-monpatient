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
            
            name: true,
            location: true,
            contactInfo: true
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

  static async getAllDoctors() {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        patients: {
          include: {
            patient: {
              select: {
                name: true,
                location: true
              }
            }
          }
        },
        chatRooms: true,
        prescriptions: true,
        medicalRecords: true
      }
    })

    return doctors.map(doctor => ({
      id: doctor.id,
      userId: doctor.userId,
      name: doctor.name,
      specialization: doctor.specialization,
      availability: doctor.availability,
      rating: doctor.rating,
      email: doctor.user.email,
      role: doctor.user.role,
      createdAt: doctor.user.createdAt,
      updatedAt: doctor.user.updatedAt,
      patientsCount: doctor.patients.length,
      prescriptionsCount: doctor.prescriptions.length,
      activeChatRooms: doctor.chatRooms.filter(room => room.status === 'ACTIVE').length
    }))
  }

  static async getAllNurses() {
    const nurses = await prisma.nurse.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        serviceRequests: {
          include: {
            patient: {
              select: {
                name: true
              }
            }
          }
        },
        nurseVisits: true,
        medicalRecords: true
      }
    })

    return nurses.map(nurse => ({
      id: nurse.id,
      userId: nurse.userId,
      name: nurse.name,
      availability: nurse.availability,
      rating: nurse.rating,
      email: nurse.user.email,
      role: nurse.user.role,
      createdAt: nurse.user.createdAt,
      updatedAt: nurse.user.updatedAt,
      activeRequests: nurse.serviceRequests.filter(service => 
        service.status === 'REQUESTED'
      ).length,
      inProgressServices: nurse.serviceRequests.filter(service => 
        service.status === 'IN_PROGRESS'
      ).length,
      completedServices: nurse.serviceRequests.filter(service => 
        service.status === 'COMPLETED'
      ).length,
      totalVisits: nurse.nurseVisits.length,
      medicalRecordsCount: nurse.medicalRecords.length
    }))
  }

  static async getAllPatients() {
    const patients = await prisma.patient.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        },
        doctors: {
          include: {
            doctor: {
              select: {
                name: true,
                specialization: true
              }
            }
          }
        },
        prescriptions: true,
        medicalRecord: true,
        nurseServiceRequests: {
          include: {
            nurse: {
              select: {
                name: true
              }
            }
          }
        },
        chatRooms: true
      }
    })

    return patients.map(patient => ({
      id: patient.id,
      userId: patient.userId,
      name: patient.name,
      location: patient.location,
      contactInfo: patient.contactInfo,
      email: patient.user.email,
      role: patient.user.role,
      createdAt: patient.user.createdAt,
      updatedAt: patient.user.updatedAt,
      doctorsCount: patient.doctors.length,
      activePrescriptions: patient.prescriptions.filter(p => !p.approved).length,
      completedPrescriptions: patient.prescriptions.filter(p => p.approved).length,
      hasActiveNurseService: patient.nurseServiceRequests.some(service => 
        service.status === 'IN_PROGRESS' || service.status === 'REQUESTED'
      ),
      activeNurseRequests: patient.nurseServiceRequests.filter(req => 
        req.status === 'REQUESTED'
      ).length,
      hasMedicalRecord: !!patient.medicalRecord,
      activeChatRooms: patient.chatRooms.filter(room => room.status === 'ACTIVE').length
    }))
  }

  static async getUserById(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error('Invalid user ID')
    }

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
