import { PrismaClient } from '@prisma/client'
import { AuthService } from './auth.service.js'

const prisma = new PrismaClient()

export class AdminService {
  //nusers
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
  static async UpdateNurse(id, userData) {
  const existingNurse = await prisma.nurse.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: true
    }
  })

  if (!existingNurse) {
    throw new Error('Nurse not found')
  }
  return await prisma.nurse.update({
    where: { id: parseInt(id) },
    data: userData
  })
  }
  static async createNurse(userData) {
    return await prisma.nurse.create({
      data: userData
    })
  }
  static async deleteNurse(id) {
    const existingNurse = await prisma.nurse.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })

    if (!existingNurse) {
      throw new Error('Nurse not found')
    }
    return await prisma.nurse.delete({
      where: { id: parseInt(id) }
    })
  }
  static async getNurseByid(id){
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const nurse =await  prisma.nurse.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })
    return nurse
  }
  //doctors
  static async getAllDoctors() {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            name:true,
            createdAt: true,
            updatedAt: true
          }
        },
        patients: {
          include: {
            patient: {
              select: {
                name: true
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
  static async updateDoctor(id, userData) {
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })

    if (!existingDoctor) {
      throw new Error('Doctor not found')
    }
    return await prisma.doctor.update({
      where: { id: parseInt(id) },
      data: userData
    })
  }
  static async createDoctor(userData) {
    return await prisma.doctor.create({
      data: userData
    })
  }
  static async deleteDoctor(id) {
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })

    if (!existingDoctor) {
      throw new Error('Doctor not found')
    }
    return await prisma.doctor.delete({
      where: { id: parseInt(id) }
    })
  }
  static async getDoctorByid(id){
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const doctor =await  prisma.doctor.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })
    return doctor
  }
  //users
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
  //pharmacies
   static async getAllPharmacies() {
    const pharmacies = await prisma.pharmacy.findMany({
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
        patients: true,
        prescriptions: true,
        medicalRecords: true
      }
    })

    return pharmacies.map(pharmacy => ({
      id: pharmacy.id,
      userId: pharmacy.userId,
      name: pharmacy.name,
      location: pharmacy.location,
      email: pharmacy.user.email,
      role: pharmacy.user.role,
      createdAt: pharmacy.user.createdAt,
      updatedAt: pharmacy.user.updatedAt,
      patientsCount: pharmacy.patients.length,
      prescriptionsCount: pharmacy.prescriptions.length,
      medicalRecordsCount: pharmacy.medicalRecords.length
    }))
   }
   static async updatePharmacyById(id, data) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('Invalid pharmacy ID')
  }
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: parseInt(id) }
  })

  if (!pharmacy) {
    throw new Error('Pharmacy not found')
  }

  return await prisma.pharmacy.update({
    where: { id: parseInt(id) },
    data
  })
   }
   static async deletePharmacy(id) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: parseInt(id) }
  })

  if (!pharmacy) {
    throw new Error('Pharmacy not found')
  }

  // Delete the pharmacy (this will cascade delete role-specific data)
  await prisma.pharmacy.delete({
    where: { id: parseInt(id) }
  })
  return { message: 'Pharmacy deleted successfully' }
   }
   static async getPharmacyById(id){
  if(!id || isNaN(parseInt(id))){
    throw new Error('Invalid user ID')
  }
  const pharmacy =await  prisma.pharmacy.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: true
    }
  })
  return pharmacy
   }
  //admins
   static async getAllAdmins() {
    const admins = await prisma.admin.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    })

    return admins.map(admin => ({
      id: admin.id,
      userId: admin.userId,
      name: admin.name,
      email: admin.user.email,
      role: admin.user.role,
      createdAt: admin.user.createdAt,
      updatedAt: admin.user.updatedAt
    }))
   } 
   static async updateAdminById(id, data) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('Invalid admin ID')
  }
  const admin = await prisma.admin.findUnique({
    where: { id: parseInt(id) }
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
    const admin = await prisma.admin.findUnique({
      where: { id: parseInt(id) }
    })
  
    if (!admin) {
      throw new Error('Admin not found')
    }
  
    // Delete the admin (this will cascade delete role-specific data)
    await prisma.admin.delete({
      where: { id: parseInt(id) }
    })
    return { message: 'Admin deleted successfully' }
   }
   static async getAdminByid(id){
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const admin =await  prisma.admin.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true
      }
    })
    return admin
   }
  //patients
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
   static async getPatientByid(id){
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const patient =await  prisma.patient.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
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
    return patient
   }
   static async updatePatientById(id, data) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('Invalid patient ID')
  }
  const patient = await prisma.patient.findUnique({
    where: { id: parseInt(id) }
  })

  if (!patient) {
    throw new Error('Patient not found')
  }
    return await prisma.patient.update({
      where: { id: parseInt(id) },
      data
    })
   }
   static async deletePatientById(id) {
  if (!id || isNaN(parseInt(id))) {
    throw new Error('Invalid patient ID')
  }
  const patient = await prisma.patient.findUnique({
    where: { id: parseInt(id) }
  })
  if (!patient) {
    throw new Error('Patient not found')
  }
  return await prisma.patient.delete({
    where: { id: parseInt(id) }
  })
   } 
}
