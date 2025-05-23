import { PrismaClient } from '@prisma/client';
import { createNotification } from '../middleware/notification.middleware.js';
import { read } from 'fs';
const prisma = new PrismaClient();

export class PrescriptionService {
  static async getAllPrescriptions() {
    try {
      const prescriptions = await prisma.prescription.findMany({
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
          items: { 
            include: { 
              medicine: true 
            } 
          }
        },
      });
  
      return prescriptions.map((prescription) => ({
        id: prescription.id,
        date: prescription.date,
        details: prescription.details,
        approved: prescription.approved,
        patient: {
          id: prescription.patient.id,
          name: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
          email: prescription.patient.user.email,
        },
        doctor: {
          id: prescription.doctor.id,
          name: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
          email: prescription.doctor.user.email,
        },
        items: prescription.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          dosage: item.dosage,
          instructions: item.instructions,
          medicine: {
            id: item.medicine.id,
            name: item.medicine.name,
            description: item.medicine.description
            // Add other medicine fields you need
          }
        })),
        pharmacy: prescription.pharmacy
          ? {
              id: prescription.pharmacy.id,
              name: prescription.pharmacy.user.firstname, // Assuming first name is the pharmacy name
              email: prescription.pharmacy.user.email,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }
  }
  static async doctorgethisprescription(doctorId){
    const prescription=await prisma.prescription.findMany(
       {where:{doctorId},
       include: {
        patient: { include: { user: {
          select:{firstname:true,lastname:true,email:true}
        } } },
        doctor: { include: { user: {select:{firstname:true,lastname:true,email:true}} } },
        pharmacy: { include: { user: {select:{firstname:true,lastname:true,email:true}} } },
      },
   
    },
       
    )
     if(!prescription){
      console.log('error')
      throw new Error("prescription not found")
    }
    return prescription
  }
  static async getPrescriptionById(id) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { include: { user: {
          select:{firstname:true,lastname:true,email:true}
        } } },
        doctor: { include: { user: {select:{firstname:true,lastname:true,email:true}} } },
        pharmacy: { include: { user: {select:{firstname:true,lastname:true,email:true}} } },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    return prescription;
  }

// In your prescription.service.js
static async createPrescription(doctorId, data, fastify) {
  if (!data.patientId || !data.details) {
    throw new Error('Missing required fields (patientId, doctorId, details)');
  }

  // Validate prescription items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error('Prescription must include at least one item');
  }

  // Check doctor-patient relationship
  const doctorPatientRelation = await prisma.doctorPatient.findUnique({
    where: {
      patientId_doctorId: {
        patientId: data.patientId,
        doctorId: doctorId
      }
    }
  });

  if (!doctorPatientRelation?.active) {
    throw new Error('No active relationship exists between this doctor and patient');
  }

  // Create the prescription
  const prescription = await prisma.prescription.create({
    data: {
      details: data.details,
      approved: data.approved ?? false,
      patient: { connect: { id: data.patientId } },
      doctor: { connect: { id: doctorId } },
      pharmacy: data.pharmacyId ? { connect: { id: data.pharmacyId } } : undefined,
      items: data.items,
    },
    include: {
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true
            }
          }
        }
      },
      patient: {
        include: {
          user: {
            select: {
              id: true,  // This is the user ID we need for notification
              firstname: true,
              lastname: true
            }
          }
        }
      },
      pharmacy: true
    }
  });

  // Send notification to patient's user account
  if (prescription.patient.user?.id) {
    try {
      await createNotification(
        {
          type: 'NEW_PRESCRIPTION',
          title: 'New Prescription Created',
          message: `Dr. ${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname} has created a new prescription for you`,
          metadata: {
            prescriptionId: prescription.id,
            doctorName: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
            timestamp: new Date().toISOString()
          }
        },
        prescription.patient.user.id,  // Send to patient's user account
        { fastify }
      );
    } catch (notificationError) {
      console.error('Failed to send prescription notification:', notificationError);
      // Don't fail the prescription creation if notification fails
    }
  }

  return { prescription };
}

  static async updatePrescription(id, data) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }

    const existingPrescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!existingPrescription) {
      throw new Error('Prescription not found');
    }

    return await prisma.prescription.update({
      where: { id },
      data: {
        details: data.details,
        approved: data.approved,
        pharmacy: data.pharmacyId ? { connect: { id: data.pharmacyId } } : undefined,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        pharmacy: { include: { user: true } },
      },
    });
  }

  static async deletePrescription(id) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }
    const existingPrescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!existingPrescription) {
      throw new Error('Prescription not found');
    }

    await prisma.prescription.delete({ where: { id } });

    return { message: 'Prescription deleted successfully' };
  }
  static async getPrescriptionsByPatientId(patientId) {
    if (!patientId) {
      throw new Error('Invalid patient ID');
    }

    try {
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
        },
        orderBy: {
          date: 'desc', // Optional: order by date descending (newest first)
        },
      });

      return prescriptions.map((prescription) => ({
        id: prescription.id,
        date: prescription.date,
        details: prescription.details,
        approved: prescription.approved,
        patient: {
          id: prescription.patient.id,
          name: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
          email: prescription.patient.user.email,
        },
        doctor: {
          id: prescription.doctor.id,
          name: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
          email: prescription.doctor.user.email,
        },
        pharmacy: prescription.pharmacy
          ? {
              id: prescription.pharmacy.id,
              name: prescription.pharmacy.user.firstname,
              email: prescription.pharmacy.user.email,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch patient prescriptions: ${error.message}`);
    }
  }
}
