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
      if (!id || isNaN(id)) {
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
    static async getPharmacyById(id){
      if(!id || isNaN(id)){
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
}