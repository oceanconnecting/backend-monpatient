import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export async function getPrescriptionsByPharmacy(pharmacyId) {
  if (!pharmacyId) {
    throw new Error('Pharmacy ID is required');
  }

  const prescriptions = await prisma.prescription.findMany({
    where: {
      pharmacyId: Number(pharmacyId),
    },
  });

  return prescriptions;
}
