import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export async function getPrescriptionsByPharmacy(pharmacyId,page=1,limite=10) {
  if (!pharmacyId) {
    throw new Error('Pharmacy ID is required');
  }
  
  const pageInt=parseInt(page)
  const pageLimit=parseInt(limite)
  const skip=(pageInt - 1) * pageLimit
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
  orders:{
    select:{
      id:true,
      status:true

    }
  }

    },
  skip,
  take:pageLimit
  });
  const totalCount= await prisma.prescription.count({
    where:{pharmacyId:pharmacyId}
  })
 const transformedPrescriptions = prescriptions.map(prescription => ({
    id: prescription.id,
    patientFullName: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
    pharmacyFullName: `${prescription.pharmacy.user.firstname} ${prescription.pharmacy.user.lastname}`,
    doctorFullName: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
    items: prescription.items,
    orders: prescription.orders,
  }));

  // Map over prescriptions to add concatenated name fields
 const totalPages = Math.ceil(totalCount / pageLimit);
  const hasNextPage = pageInt < totalPages;
  const hasPreviousPage = pageInt > 1;
    return {
      data: transformedPrescriptions,
    pagination: {
      currentPage: pageInt,
      totalPages,
      totalCount,
      pageSize: pageLimit,
      hasNextPage,
      hasPreviousPage
      
    }
  
}
}