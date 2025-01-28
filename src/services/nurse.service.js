import { PrismaClient } from "@prisma/client";
const prisma =new PrismaClient()

export class NurseService{
    static async getAllNurses() {
        const nurses = await prisma.user.findMany({
          where:{
            role:'NURSE'
          },
          include: {
            nurse: {
              select: {
                id: true,
                availability: true,
                rating: true,
                createdAt: true,
                updatedAt: true
              },
              include:{
                serviceRequests: {
                    include: {
                      patient: {
                        select: {
                          name: true
                        }
                      }
                    }
                  },
              } ,
               nurseVisits: true,
             medicalRecords: true
            },
            
          
          }
        })
        return nurses.map(user => ({
          id: user.id,
          userId: user.userId,
          name: user.name,
          availability: user.availability,
          rating: user.rating,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          activeRequests: user.nurse.serviceRequests.filter(service => 
            service.status === 'REQUESTED'
          ).length,
          inProgressServices: user.nurse.serviceRequests.filter(service => 
            service.status === 'IN_PROGRESS'
          ).length,
          completedServices: user.nurse.serviceRequests.filter(service => 
            service.status === 'COMPLETED'
          ).length,
          totalVisits: user.nurse.nurseVisits.length,
          medicalRecordsCount: user.nurse.medicalRecords.length
        }))
    }
    static async UpdateNurse(id,userData){
       const existingNurse=await prisma.user.findUnique({
        where:{id:parseInt(id)},
        include: {
          nurse: true
        }
       })
       if(!existingNurse){
        throw new Error('Nurse not found')
       }
       return prisma.user.update({
        where:{id:parseInt(id)},
        data:{
          name:userData.name,
          nurse:{
            update:{
              availability:userData.availability,
              rating:userData.rating
            }
          }
        }
       })
    }
    static async createNurse(userData) {
        return await prisma.user.create({
          data: userData,
          role:'NURSE'
        })
    }
    static async deleteNurse(id) {
        const existingNurse = await prisma.user.findUnique({
          where: { id: parseInt(id) },
          include: {
            nurse: true
          }
        })
    
        if (!existingNurse) {
          throw new Error('Nurse not found')
        }
        return await prisma.user.delete({
          where: { id: parseInt(id) ,role:'NURSE'}
        })
    }
    static async getNurseByid(id){
        if(!id || isNaN(parseInt(id))){
          throw new Error('Invalid user ID')
        }
        const user =await prisma.user.findUnique({
          where: { id: parseInt(id) },
          include: {
            nurse: true
          }
        })
        return user
    }
}