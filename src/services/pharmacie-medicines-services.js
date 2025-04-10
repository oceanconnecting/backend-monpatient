


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const PharmacyMedicinesService = {
  async getMedicinesByPharmacy(pharmacyId) {
    return await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      include: { medicines: true },
    });
  },

  async createMedicine(pharmacyId, { name, description, stock = 0, price }) {
    return await prisma.medicine.create({
      data: {
        name,
        description,
        stock,
        price,
        pharmacies: {
          connect: { id: pharmacyId },
        },
      },
    });
  },
};
