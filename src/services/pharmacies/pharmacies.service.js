import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()
export class PharmacyService {
  //pharmacy controller
    static async getAllPharmacies() {
        const users = await prisma.user.findMany({
          where: {
            role: 'PHARMACY'
          },
        
          include: {
            pharmacy: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            patients: true,
            prescriptions: true,
            medicalRecords: true
            },
          }
        })
        return users.map(user => ({
          id: user.id,
          userId: user.userId,
          name: user.name,
          location: user.pharmacy.location,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          patientsCount: user.pharmacy.patients.length,
          prescriptionsCount: user.pharmacy.prescriptions.length,
          medicalRecordsCount: user.pharmacy.medicalRecords.length
        }))
    }
    static async updatePharmacyById(id, data) {
      if (!id) {
        throw new Error('Invalid pharmacy ID')
      }
      const pharmacy = await prisma.user.findUnique({
        where: { id ,role:'PHARMACY' }
      })
    
      if (!pharmacy) {
        throw new Error('Pharmacy not found')
      }
    
      return await prisma.user.update({
        where: { id ,role:'PHARMACY'},
        data
      })
    }
    static async deletePharmacy(id) {
      const pharmacy = await prisma.user.findUnique({
        where: { id ,role:'PHARMACY'}
      })
    
      if (!pharmacy) {
        throw new Error('Pharmacy not found')
      }
      // Delete the pharmacy (this will cascade delete role-specific data)
      await prisma.user.delete({
        where: { id ,role:'PHARMACY'}
      })
      return { message: 'Pharmacy deleted successfully' }
    }
    static async pharcygetMedicine(id){
      const pharmacy =await prisma.pharmacy.findUnique(
        {
          where:{id},
          include:{
            medicines:true
          }
        }
      )
      return pharmacy
    }
    static async getPharmacyById(id){
      if(!id){
        throw new Error('Invalid user ID')
      }
      const pharmacy =await  prisma.user.findUnique({
        where: { id ,role:'PHARMACY'},
        include: {
          pharmacy: true
        }
      })
      return pharmacy
    }
    static async createPharmacy(userData) {
      return await prisma.user.create({
        data: {
          firstname: userData.firstname,
          lastname: userData.lastname,
          role: 'PHARMACY',  // Ensure role is always 'PATIENT'
          telephoneNumber: userData.telephoneNumber,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
          address: userData.address,
          profilePhoto: userData.profilePhoto,
          pharmacy: {
            create: {
              name: userData.pharmacy.name,
              location: userData.pharmacy.location
            }
          }
        },
        include: {
          pharmacy: true
        }
      })
    }
    static async makeprocessOrder(orderId){
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
    
      if (!order) throw new Error('NOT_FOUND');
    if(order.status==='Processing')return{
  success:true,
  message:'Order already in Processing status',
  data: order
  }
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'Processing' },
      });
    
      return updatedOrder; // This will be the response data
    }
    static async makedelivrie(orderId){
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
    
      if (!order) throw new Error('NOT_FOUND');
      if (order.status !== 'Processing') throw new Error('INVALID_STATUS');
    
      return prisma.order.update({
        where: { id: orderId },
        data: { status: 'Delivered' },
      });

    }
    static async getAllorders(){
      return prisma.order.findMany()
    }
}