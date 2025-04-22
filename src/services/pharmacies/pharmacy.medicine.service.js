import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const PharmacyMedicinesService = {
  async getPharmacyMedicines(id, { page = 1, limit = 50 } = {}) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        medicines: {
          take: limit,
          skip: (page - 1) * limit
        },
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true
          }
        }
      }
    });
    return pharmacy;
  },
  
  async getAllMedicines() {
    return await prisma.medicine.findMany();
  },
  
  async createMedicines(pharmacyId, medicinesArray) {
    return await prisma.medicine.createMany({
      data: medicinesArray.map(medicine => ({
        ...medicine,
        pharmacyId: pharmacyId
      }))
    });
  },
  
  async updateMedicine(medicineId, medicineData) {
    return await prisma.medicine.update({
      where: { id: medicineId },
      data: medicineData
    });
  },
  
  async deleteMedicine(id) {
    const medicine = await prisma.medicine.findUnique({
      where: { id }
    });
    
    if (!medicine) {
      throw new Error('Medicine not found');
    }
    
    return await prisma.medicine.delete({ where: { id } });
  }
};