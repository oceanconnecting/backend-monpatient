import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PatientService {
  // Fetch all patients with related data
  static async getAllPatients() {
    try {
      const patients = await prisma.patient.findMany({
        include: {
          doctors: true,
          user: true,
          medicalRecord: true,
          nurseServiceRequests: {
            include: {
              nurse: true,
            },
          },
          chatRooms: true,
        },
      });

      return patients.map((patient) => ({
        id: patient.id,
        userId: patient.user.id,
        firstname: patient.user.firstname,
        lastname: patient.user.lastname,
        email: patient.user.email,
        role: patient.user.role,
        telephoneNumber: patient.user.telephoneNumber,
        dateOfBirth: patient.user.dateOfBirth,
        gender: patient.user.gender,
        address: patient.user.address,
        profilePhoto: patient.user.profilePhoto,
        createdAt: patient.user.createdAt,
        updatedAt: patient.user.updatedAt,
        doctorsCount: patient.doctors?.length || 0,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }
  }
  // Fetch a single patient by ID
  static async getPatientById(id) {
    if (!id) {
      throw new Error('Invalid patient ID');
    }
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: true,
        doctors: {
          include: {
            doctor: {
              select: {
                specialization: true,
              },
            },
          },
        },
        prescriptions: true,
        medicalRecord: true,
        nurseServiceRequests: {
          include: {
            nurse: true,
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
    if (!id) {
      throw new Error('Invalid patient ID');
    }

    const patient = await prisma.user.findFirst({
      where: { id, role: 'PATIENT' },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await prisma.patient.update({
      where: { id },
      data,
    });
  }
 // Cretae a patient
  static async createPatient(data) {
  if (!data) {
    throw new Error('Invalid patient data');
  }

  // Create the patient with the Cloudinary URL
  return await prisma.user.create({
    data: {
      firstname: data.firstname,
      lastname: data.lastname,
      role: 'PATIENT', // Ensure role is always 'PATIENT'
      telephoneNumber: data.telephoneNumber,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      address: data.address,
     // Use the Cloudinary URL
      patient: {
        create: {
          allergies: data.patient.allergies,
          emergencyContactName: data.patient.emergencyContactName,
          emergencyContactPhone: data.patient.emergencyContactPhone,
          emergencyContactRelationship: data.patient.emergencyContactRelationship,
          insuranceInfo: data.patient.insuranceInfo,
          preferredPharmacy: data.patient.preferredPharmacy,
        },
      },
    },
    include: {
      patient: true,
    },
  });
  } 
  static async updatePatientDetails(patientId, detailsData) {
    if (!patientId) {
      throw new Error('Invalid patient ID');
    }
  
    // Verify patient exists
    const patientRecord = await prisma.patient.findUnique({
      where: { id: patientId }
    });
  
    if (!patientRecord) {
      throw new Error('Patient not found');
    }
  
    // Update patient details
    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: {
        allergies: detailsData.allergies,
        emergencyContactName: detailsData.emergencyContactName,
        emergencyContactPhone: detailsData.emergencyContactPhone,
        emergencyContactRelationship: detailsData.emergencyContactRelationship,
        insuranceInfo: detailsData.insuranceInfo,
        preferredPharmacy: detailsData.preferredPharmacy
      },
      include: {
        user: true
      }
    });
  
    return updatedPatient;
  }
  // Delete a patient by ID
  static async deletePatientById(id) {
    if (!id ) {
      throw new Error('Invalid patient ID');
    }

    const patient = await prisma.user.findFirst({
      where: { id, role: 'PATIENT' },
    });

    if (!patient) {
      throw new Error('Patient not found');
    }

    return await prisma.user.delete({
      where: { id},
    });
  }
  // Get all doctors
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

  // Get emergency contact
  static async getEmergencyContact(id) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id },
        select: {
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelationship: true,
        },
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      return patient;
    } catch (error) {
      throw new Error(error.message);
    }
  }
  // Update a patient's emergency contact details
  static async updateEmergencyContact(id, data) {
    const { emergencyContactName, emergencyContactPhone, emergencyContactRelationship } = data;

    try {
      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: {
          emergencyContactName,
          emergencyContactPhone,
          emergencyContactRelationship,
        },
      });

      return updatedPatient;
    } catch (error) {
      throw new Error('Could not update emergency contact');
    }
  }
  static async patientsendOrderMedicine(id, data) {
    const { prescriptionId, pharmacyId } = data;
    
    // First verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id },
    });
    
    if (!patient) {
      throw new Error('Patient not found');
    }
    
    // Verify the prescription exists and belongs to this patient
    const prescription = await prisma.prescription.findFirst({
      where: {
        id: prescriptionId,
        patientId: id,
        // approved: true, // Ensuring prescription is approved
      },
    });
    
    if (!prescription) {
      throw new Error('Valid prescription not found');
    }
    
    // Update the prescription with pharmacy info if provided
    if (pharmacyId) {
      await prisma.prescription.update({
        where: { id: prescriptionId },
        data: { pharmacyId }
      });
    }
    
    // Create an order
    const order = await prisma.order.create({
      data: {
        patient: { connect: { id } },
        pharmacy: { connect: { id: pharmacyId } },
        prescription: { connect: { id: prescriptionId } },
        status: 'PENDING',
      }
    });
    
    return order;
  }
}
