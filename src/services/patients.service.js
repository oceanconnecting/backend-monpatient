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
      firstname: patient.firstname,
      lastname: patient.lastname,
      email: patient.email,
      role: patient.role,
      telephoneNumber: patient.telephoneNumber,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      profilePhoto: patient.profilePhoto,
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
    data: {
      firstname: data.firstname,
      lastname: data.lastname,
      role: 'PATIENT',  // Ensure role is always 'PATIENT'
      telephoneNumber: data.telephoneNumber,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      address: data.address,
      profilePhoto: data.profilePhoto,
      patient: {
        create: {
          allergies: data.patient.allergies,
          emergencyContactName: data.patient.emergencyContactName,
          emergencyContactPhone: data.patient.emergencyContactPhone,
          emergencyContactRelationship: data.patient.emergencyContactRelationship,
          insuranceInfo: data.patient.insuranceInfo,
          preferredPharmacy: data.patient.preferredPharmacy
        }
      }
    },
    include: {
      patient: true
    }
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
              role:true,
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
              role:true,
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
              role:true,
              firstname:true,
              lastname:true
            },
          },
        },
      }
    );
  }
}
