import { PrismaClient } from '@prisma/client';

import { uploadToCloudinary } from '../../utils/uploadToCloudinary.js';
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
 static async createPatient(data, file) {
  if (!data) {
    throw new Error('Invalid patient data');
  }

  let profilePhotoUrl = null;

  // Upload file to Cloudinary if a file is provided
  if (file) {
    try {
      const cloudinaryResult = await uploadToCloudinary(file);
      profilePhotoUrl = cloudinaryResult.secure_url; // Get the Cloudinary URL
    } catch (error) {
      throw new Error(`Failed to upload profile photo: ${error.message}`);
    }
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
      profilePhoto: profilePhotoUrl, // Use the Cloudinary URL
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
