import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export async function getPrescriptionsByPharmacy(pharmacyId) {
  if (!pharmacyId) {
    throw new Error('Pharmacy ID is required');
  }
  
  const prescriptions = await prisma.prescription.findMany({
    where: {
      pharmacyId: pharmacyId,
    },
    include: {
      patient: {
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
      },
      pharmacy: {
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
      },
      doctor: {
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              email: true,
            },
          },
        },
      },
    }
  });
  
  // Map over prescriptions to add concatenated name fields
  const enhancedPrescriptions = prescriptions.map(prescription => {
    return {
      id: prescription.id,
      patient: {
        ...prescription.patient,
        fullName: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
        user: prescription.patient.user
      },
      pharmacy: {
        ...prescription.pharmacy,
        fullName: `${prescription.pharmacy.user.firstname} ${prescription.pharmacy.user.lastname}`,
        user: prescription.pharmacy.user
      },
      doctor: {
        ...prescription.doctor,
        fullName: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
        user: prescription.doctor.user
      }
    };
  });
  
  return enhancedPrescriptions;
}
