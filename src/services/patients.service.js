import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PatientService {
  // Fetch all patients with related data
  static async getAllPatients() {
    const patients = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
      },
      include: {
        doctor: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        prescriptions: true,
        medicalRecord: true,
        nurseServiceRequests: {
          include: {
            nurse: {
              select: {
                name: true,
              },
            },
          },
        },
        chatRooms: true,
      },
    });

    return patients.map((patient) => ({
      id: patient.id,
      userId: patient?.id,
      name: patient.name,
      email: patient?.email,
      role: patient?.role,
      createdAt: patient?.createdAt,
      updatedAt: patient?.updatedAt,
      doctorsCount: patient.doctor?.length || 0,
      activePrescriptions: patient.prescriptions.filter((p) => !p.approved).length,
      completedPrescriptions: patient.prescriptions.filter((p) => p.approved).length,
      hasActiveNurseService: patient.nurseServiceRequests.some(
        (service) => service.status === 'IN_PROGRESS' || service.status === 'REQUESTED'
      ),
      activeNurseRequests: patient.nurseServiceRequests.filter((req) => req.status === 'REQUESTED').length,
      hasMedicalRecord: !!patient.medicalRecord,
      activeChatRooms: patient.chatRooms.filter((room) => room.status === 'ACTIVE').length,
    }));
  }
  // Fetch a single patient by ID
  static async getPatientById(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error('Invalid patient ID');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        doctors: {
          include: {
            doctor: {
              select: {
                name: true,
                specialization: true,
              },
            },
          },
        },
        prescriptions: true,
        medicalRecord: true,
        nurseServiceRequests: {
          include: {
            nurse: {
              select: {
                name: true,
              },
            },
          },
        },
        chatRooms: true,
      },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return patient;
  }
  // Update a patient by ID
  static async updatePatientById(id, data) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error('Invalid patient ID');
    }

    const patient = await prisma.user.findFirst({
      where: { id: parseInt(id), role: 'PATIENT' },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await prisma.patient.update({
      where: { id: parseInt(id) },
      data,
    });
  }
 // Cretae a patient
  static async createPatient(data) {
    return await prisma.user.create({
      data,
      role: 'PATIENT',
    });
  }
  // Delete a patient by ID
  static async deletePatientById(id) {
    if (!id || isNaN(parseInt(id))) {
      throw new Error('Invalid patient ID');
    }

    const patient = await prisma.user.findFirst({
      where: { id: parseInt(id), role: 'PATIENT' },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await prisma.user.delete({
      where: { id: parseInt(id) },
    });
  }
  static async getAlldoctors() {
    return await prisma.doctor.findMany(
      {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstname:true,
              lastname:true,
            
            },
          },
        },
      }
    );
  }
  static async getAllnurses() {
    return await prisma.nurse.findMany(
      {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstname:true,
              lastname:true,
            
            },
          },
        },
      }
    );
  }
  static async getAllpharmacies() {
    return await prisma.pharmacy.findMany(
      {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstname:true,
              lastname:true,
            
            },
          },
        },
      }
    );
  }
}
