import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()
export class PharmacyService {
    static async getAllPharmacies() {
        const users = await prisma.user.findMany({
          where: {
            role: 'pharmacy'
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
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid pharmacy ID')
      }
      const pharmacy = await prisma.user.findUnique({
        where: { id: parseInt(id) ,role:'PHARMACY' }
      })
    
      if (!pharmacy) {
        throw new Error('Pharmacy not found')
      }
    
      return await prisma.user.update({
        where: { id: parseInt(id) ,role:'PHARMACY'},
        data
      })
    }
    static async deletePharmacy(id) {
      const pharmacy = await prisma.user.findUnique({
        where: { id: parseInt(id) ,role:'PHARMACY'}
      })
    
      if (!pharmacy) {
        throw new Error('Pharmacy not found')
      }
      // Delete the pharmacy (this will cascade delete role-specific data)
      await prisma.user.delete({
        where: { id: parseInt(id) ,role:'PHARMACY'}
      })
      return { message: 'Pharmacy deleted successfully' }
    }
    static async getPharmacyById(id){
      if(!id || isNaN(parseInt(id))){
        throw new Error('Invalid user ID')
      }
      const pharmacy =await  prisma.user.findUnique({
        where: { id: parseInt(id) ,role:'PHARMACY'},
        include: {
          pharmacy: true
        }
      })
      return pharmacy
    }
}