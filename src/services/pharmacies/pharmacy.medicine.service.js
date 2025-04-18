import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PharmacyMedicinesService = {
  async getMedicinesByPharmacy(pharmacyId) {
    return await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { medicines: true },
    });
  },
  async createMedicines(pharmacyId, medicinesArray) {
    return await prisma.medicine.createMany({
      data: medicinesArray.map(medicine => ({
        ...medicine,
        pharmacyId: pharmacyId
      })),
      skipDuplicates: true
    });
  },
  async updateMedicine(medicineId, medicineData) {
    return await prisma.medicine.update({
      where: { id: medicineId },
      data: medicineData
    });
  },
  async deleteMedicine(id,reply) {
    const medicine = await prisma.medicine.findUnique({
      where: { id }
    });
    if (!medicine) {
      return reply.status(404).send({ error: 'Medicine not found' });
    }
    return await prisma.medicine.delete({ where: { id } });
  }
};
