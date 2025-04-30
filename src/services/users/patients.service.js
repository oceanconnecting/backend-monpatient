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
  static async getDoctorsOfPatient(id) {
    console.log(`Getting doctors for patient ID: ${id}`);
    
    const doctorPatientRequests = await prisma.doctorPatientRequest.findMany({
      where: {
        patientId: id
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        },
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${doctorPatientRequests.length} doctor-patient relationships`);
    
    // Map and concatenate data
    const formattedResults = doctorPatientRequests.map(relation => {
      console.log(`Processing relation ID: ${relation.id}`);
      
      const doctorFullName = `${relation.doctor.user.firstname} ${relation.doctor.user.lastname}`;
      
      return {
        relationId: relation.id,
        status: relation.status,
        doctorId: relation.doctorId,
        patientId: relation.patientId,
        doctor: {
          ...relation.doctor,
          fullName: doctorFullName,
          user: relation.doctor.user
        }
      };
    });
    
    console.log(`Returning ${formattedResults.length} formatted results`);
    return formattedResults;
  }
  static async getnurseOfpatient(id) {
    console.log(`Getting doctors for patient ID: ${id}`);
    
    const nurserPatientRequests = await prisma.nurseServiceRequest.findMany({
      where: {
        patientId: id
      },
      include: {
        nurse: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        },
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    console.log(`Found ${nurserPatientRequests.length} doctor-patient relationships`);
    
    // Map and concatenate data
    const formattedResults = nurserPatientRequests.map(relation => {
      console.log(`Processing relation ID: ${relation.id}`);
      
      const nurseFullName = `${relation.nurse.user.firstname} ${relation.nurse.user.lastname}`;
     
      
      return {
        relationId: relation.id,
        status: relation.status,
        nurseId: relation.nurseId,
        patientId: relation.patientId,
        nurse: {
          ...relation.nurse,
          fullName: nurseFullName,
          user: relation.nurse.user
        }
      };
    });
    
    console.log(`Returning ${formattedResults.length} formatted results`);
    return formattedResults;
  }
  static async getAllDoctors(){
    const doctors=await prisma.doctor.findMany({
      include:{
        user:{
          select:{
            firstname:true,
            lastname:true,
            email:true
          }
        }
      }
    })
    const formatdata=doctors.map(doctor=>{
      const fullName=`${doctor.user.firstname} ${doctor.user.lastname}`
      return{
        id:doctor.id,
        name:fullName,
        specialization:doctor.specialization,
        email:doctor.user.email
      }
    })
    return formatdata
  }
  static async getDoctorById(id) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            profilePhoto: true,
            telephoneNumber: true,
            email: true
          }
        }
      }
    });
    
    if (!doctor) return null;
    
    return {
      id: doctor.id,
      name: `${doctor.user.firstname} ${doctor.user.lastname}`,
      email: doctor.user.email,
      telephoneNumber: doctor.user.telephoneNumber,
      specialization: doctor.specialization,
      hospitalAffiliation: doctor.hospitalAffiliation,
      experience: doctor.experience,
      professionalLicenseNumber: doctor.professionalLicenseNumber,
      profilePhoto: doctor.user.profilePhoto,
      medicalDiploma: doctor.medicalDiploma,
    };
  }
  
  static async getNurseById(id) {
    return await prisma.nurse.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            firstname: true,
            lastname: true,
          }
        }
      }
    });
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
    const prescription = await prisma.prescription.findUnique({
      where: {
        id: prescriptionId,
        patientId: id // Ensuring prescription is approved
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
        prescription: { connect: { id: prescriptionId } },
        pharmacy: { connect: { id: pharmacyId } },
        status: 'PENDING',
      }
    });
    
    return order;
  }
  /**
   * Update a patient's emergency contact details
   */
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
      console.error("An error occurred:", error.message);
      throw new Error(`Could not update emergency contact${error.message}`);
    }
  }
  static async getmedicalRecorde(patientId){
    const medicalRecord = await prisma.medicalRecord.findMany({
      where: { patientId: patientId }
    });
    return medicalRecord[0]; // Return first record if multiple exist
  }  
  static async getAllDoctorsAndNurses() {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
            telephoneNumber: true,
            gender: true,
            address: true,
            profilePhoto: true,
            dateOfBirth: true,
          },
        },
      },
    });
    
    const nurses = await prisma.nurse.findMany({
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
            telephoneNumber: true,
            gender: true,
            address: true,
            profilePhoto: true,
            dateOfBirth: true,
          },
        },
        serviceRequests:{
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
          },
        }
      },
    });
  
    const mappedDoctors = doctors.map(doctor => ({
      ...doctor,
      role: 'doctor',
      name: `${doctor.user.firstname} ${doctor.user.lastname}`,
    }));
  
    const mappedNurses = nurses.map(nurse => ({
      ...nurse,
      role: 'nurse',
      serviceRequests: nurse.serviceRequests.map(request => ({
        rating: request.rating,
        feedback: request.feedback,
        firstName: request.patient.user.firstname,
        lastName: request.patient.user.lastname,
      })),
      numberFeedbacks:nurse.serviceRequests.length,
      name: `${nurse.user.firstname} ${nurse.user.lastname}`,
    }));
  
    const allStaff = [...mappedDoctors, ...mappedNurses];
    
    return { doctors: mappedDoctors, nurses: mappedNurses, allStaff };
  }
  //search doctor and nurse by name
  static async searchDoctorsAndNursesByName(searchName) {
    // First get all doctors and nurses
    const { allStaff } = await this.getAllDoctorsAndNurses();
    
    // Convert search term to lowercase and trim whitespace
    const searchLower = searchName.toLowerCase().trim();
    
    // Filter the combined staff list based on exact name matching
    const searchResults = allStaff.filter(staff => {
      const fullName = `${staff.user.firstname} ${staff.user.lastname}`.toLowerCase();
      const firstName = staff.user.firstname.toLowerCase();
      const lastName = staff.user.lastname.toLowerCase();
      
      // Check if search term matches either:
      // 1. Full name exactly
      // 2. First name exactly
      // 3. Last name exactly
      return fullName.includes(searchLower) || 
             firstName.includes(searchLower) || 
             lastName.includes(searchLower);
    });
    
    return searchResults;
  }
  // cretae vite nurse

}
