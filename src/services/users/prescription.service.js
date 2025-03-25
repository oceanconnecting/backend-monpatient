import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrescriptionService {
  static async getAllPrescriptions() {
    try {
      const prescriptions = await prisma.prescription.findMany({
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
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
              name: prescription.pharmacy.user.firstname, // Assuming first name is the pharmacy name
              email: prescription.pharmacy.user.email,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }
  }

  static async getPrescriptionById(id) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        pharmacy: { include: { user: true } },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    return prescription;
  }

  static async createPrescription(data) {
    if (!data.patientId || !data.doctorId || !data.details) {
      throw new Error('Missing required fields (patientId, doctorId, details)');
    }

    return await prisma.prescription.create({
      data: {
        details: data.details,
        approved: data.approved ?? false,
        patient: { connect: { id: data.patientId } },
        doctor: { connect: { id: data.doctorId } },
        pharmacy: data.pharmacyId ? { connect: { id: data.pharmacyId } } : undefined,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        pharmacy: { include: { user: true } },
      },
    });
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
}
