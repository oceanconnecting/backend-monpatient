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
  }
};