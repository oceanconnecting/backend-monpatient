import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PharmacyMedicinesService = {
  async getMedicinesByPharmacy(pharmacyId) {
    return await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { medicines: true },
    });
  },
  async createMedicine(pharmacyId, data) {
    return await prisma.medicine.create({
      data: {
        name:data.name,
        description:data.description,
        dosage:data.dosage,
        manufacturer:data.manufacturer,
        category:data.category,
        sideEffects:data.sideEffects,
        instructions:data.instructions,
        price:data.price,
        pharmacy: {
          connect: { id: pharmacyId },
        },
      },
    });
  },
};