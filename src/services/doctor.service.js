import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
export class DoctorService {
     //doctors
  static async getAllDoctors() {
    const users = await prisma.user.findMany({
      where:{
        role:"DOCTOR"
      },
      include: {
        doctor: {
          select: {
            id: true,
            specialization: true,
            availability: true,
            rating: true,
            patients: {
              select: {
                id: true
              }
            },
            chatRooms: true,
            prescriptions: true,
            medicalRecords: true
          }
        },
      }
    })

    return users.map(user => ({
      id: user.id,
      userId: user.userId,
      name: user.name,
      specialization: user.doctor.specialization,
      availability: user.doctor.availability,
      rating: user.doctor.rating,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      patientsCount: user.doctor.patients.length,
      prescriptionsCount: user.doctor.prescriptions.length,
      activeChatRooms: user.doctor.chatRooms.filter(room => room.status === 'ACTIVE').length
    }))
  }
  static async updateDoctor(id, userData) {
    const existingDoctor = await prisma.user.findUnique({
      where: { id: parseInt(id) ,role:'DOCTOR'},
      include: {
        doctor: true
      }
    })

    if (!existingDoctor) {
      throw new Error('Doctor not found')
    }
    return await prisma.user.update({
      where: { id: parseInt(id) ,role:'DOCTOR'},
      data: userData,
      role:'DOCTOR'
    })
  }
  static async createDoctor(userData) {
    return await prisma.user.create({
      data: userData,
      role:'DOCTOR'
    })
  }
  static async deleteDoctor(id) {
    const existingDoctor = await prisma.user.findUnique({
      where: { id: parseInt(id) ,role:'DOCTOR'},
      include: {
        user: true
      }
    })

    if (!existingDoctor) {
      throw new Error('Doctor not found')
    }
    return await prisma.user.delete({
      where: { id: parseInt(id) ,role:'DOCTOR'}
    })
  }
  static async getDoctorByid(id){
    if(!id || isNaN(parseInt(id))){
      throw new Error('Invalid user ID')
    }
    const doctor =await  prisma.user.findUnique({
      where: { id: parseInt(id) ,role:'DOCTOR'},
      include: {
        doctor: true
      }
    })
    return doctor
  }
}