import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class DoctorPatientService {
  
  
  static async sendRequest(patientId, doctorId, message) {
    // Check if request already exists
    const existingRequest = await prisma.doctorPatientRequest.findUnique({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId
        }
      }
    })

    if (existingRequest) {
      throw new Error('Request already exists')
    }
    // Get doctor and patient details for notifications

    // Create new request
    const request = await prisma.doctorPatientRequest.create({
      data: {
        patientId: patientId,
        doctorId: doctorId,
        message,
        status: 'PENDING'
      },
      include: {
        patient: true,
        doctor: true
      }
    })
    // Create notification for doctor
    // await prisma.notification.create({
    //   data: {
    //     userId: doctor.user.id,
    //     type: 'DOCTOR_REQUEST',
    //     title: 'New Patient Request',
    //     message: `Patient ${patient.name} has requested to be added to your patient list`,
    //     metadata: {
    //       requestId: request.id,
    //       patientId: patientId,
    //       patientName: patient.name
    //     }
    //   }
    // })

    return request
  }
  
  static async handleRequest(requestId, doctorId, status) {
    const request = await prisma.doctorPatientRequest.findFirst({
      where: {
        id: requestId,
        doctorId: doctorId
      },
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    })
    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending')
    }

    if (request.doctorId !== doctorId) {
      throw new Error('Unauthorized to update this request')
    }

    // Update request status
    const updatedRequest = await prisma.doctorPatientRequest.update({
      where: { id: requestId },
      data: { status },
      include: {
        patient: true,
        doctor: true
      }
    })

    // Create notification for patient about the request status
    await prisma.notification.create({
      data: {
        userId: request.patient.user.id,
        type: 'DOCTOR_REQUEST_UPDATE',
        title: `Doctor Request ${status}`,
        message: `Dr. ${request.doctor.name} has ${status.toLowerCase()} your request`,
        metadata: {
          requestId: request.id,
          doctorId: doctorId,
          doctorName: request.doctor.name,
          status: status
        }
      }
    })

    // If accepted, create the doctor-patient relationship
    if (status === 'ACCEPTED') {
      await prisma.doctorPatient.create({
        data: {
          patientId: request.patientId,
          doctorId: request.doctorId,
          startDate: new Date(),
          active: true
        }
      })
    }

    return updatedRequest
  }
  // UPDATED METHOD: Accept request
  static async acceptRequest(requestId, doctorId) {
    try {
      console.log('Accepting request:', { requestId, doctorId })
      const request = await prisma.doctorPatientRequest.findUnique({
        where: { id: requestId },
        include: {
          patient: {
            include: { user: true }
          },
          doctor: {
            include: { user: true }
          }
        }
      })

      console.log('Fetched request:', request)

      if (!request) {
        throw new Error('Request not found')
      }

      if (request.status !== 'PENDING') {
        throw new Error('Request is not pending')
      }
      console.log('Comparing doctor IDs:', { 
        requestDoctorId: request.doctorId, 
        providedDoctorId: doctorId,
        equal: request.doctorId === doctorId
      })

      if (request.doctorId !== doctorId) {
        throw new Error('Unauthorized to accept this request')
      }

      console.log('Updating request status...')
      // Update request status to ACCEPTED
      const updatedRequest = await prisma.doctorPatientRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      })
      console.log('Updated request:', updatedRequest)

      console.log('Creating doctor-patient relationship...')
      // Create doctor-patient relationship
      await prisma.doctorPatient.create({
        data: {
          doctorId: request.doctorId,
          patientId: request.patientId,
          startDate: new Date(),
          active: true
        }
      })
      return { updatedRequest }
    } catch (error) {
      console.error('Error in acceptRequest:', error)
      throw error
    }
  }
  // UPDATED METHOD: Reject request
  static async rejectRequest(requestId, doctorId, reason = '') {
    const request = await prisma.doctorPatientRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    })

    if (!request) {
      throw new Error('Request not found')
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending')
    }

    if (request.doctorId !== doctorId) {
      throw new Error('Unauthorized to reject this request')
    }

    // Update request status
    const updatedRequest = await prisma.doctorPatientRequest.update({
      where: { id: requestId },
      data: { 
        status: 'REJECTED',
        message: reason || 'Request rejected by doctor'
      },
      include: {
        patient: true,
        doctor: true
      }
    })

    // Create notification for patient
    await prisma.notification.create({
      data: {
        userId: request.patient.user.id,
        type: 'REQUEST_REJECTED',
        title: 'Doctor Request Rejected',
        message: `Dr. ${request.doctor.name} has rejected your request. Reason: ${reason}`,
        metadata: {
          requestId: request.id,
          doctorId: doctorId,
          doctorName: request.doctor.name
        }
      }
    })

    return updatedRequest
  }
  // UPDATED METHOD: Get patient doctors with pagination
  static async getPatientDoctors(patientId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.doctorPatient.count({
      where: {
        patientId: patientId,
        active: true
      }
    });

    // Get paginated data
    const doctorPatients = await prisma.doctorPatient.findMany({
      where: {
        patientId: patientId,
        active: true
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                telephoneNumber: true,
                email: true,
                createdAt: true,
                profilePhoto: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitInt
    });

    // Format the doctor information
    const formattedDoctors = doctorPatients.map(dp => ({
      id: dp.doctor.id,
      userId: dp.doctor.userId,
      name: `${dp.doctor.user.firstname} ${dp.doctor.user.lastname}`,
      email: dp.doctor.user.email,
      telephoneNumber: dp.doctor.user.telephoneNumber,
      profilePhoto: dp.doctor.user.profilePhoto,
      specialization: dp.doctor.specialization,
      relationshipId: dp.id,
      startDate: dp.startDate,
      active: dp.active
    }));

    return {
      data: formattedDoctors,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  // UPDATED METHOD: Get doctor patients with pagination
  static async getDoctorPatients(doctorId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.doctorPatient.count({
      where: {
        doctorId: doctorId,
        active: true
      }
    });

    // Get paginated data
    const doctorPatients = await prisma.doctorPatient.findMany({
      where: {
        doctorId: doctorId,
        active: true
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                telephoneNumber: true,
                email: true,
                createdAt: true,
                profilePhoto: true,
                dateOfBirth: true,
                gender: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitInt
    });

    // Format the patient information
    const formattedPatients = doctorPatients.map(dp => ({
      id: dp.patient.id,
      userId: dp.patient.userId,
      name: `${dp.patient.user.firstname} ${dp.patient.user.lastname}`,
      email: dp.patient.user.email,
      telephoneNumber: dp.patient.user.telephoneNumber,
      profilePhoto: dp.patient.user.profilePhoto,
      dateOfBirth: dp.patient.user.dateOfBirth,
      gender: dp.patient.user.gender,
      bloodType: dp.patient.bloodType,
      allergies: dp.patient.allergies,
      chronicDiseases: dp.patient.chronicDiseases,
      relationshipId: dp.id,
      startDate: dp.startDate,
      active: dp.active
    }));

    return {
      data: formattedPatients,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  static async getDoctorPatientById(doctorId, patientId) {
    const result = await prisma.doctorPatient.findFirst({
      where: {
        doctorId: doctorId,
        patientId: patientId,
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                telephoneNumber: true,
                email: true,
                createdAt: true,
                lat: true,
                long: true,
                address: true
              }
            },
          }
        },
        doctor: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                lat: true,
                long: true,
                address: true
              }
            },
            prescriptions: {
              where: { patientId: patientId },
              select: {
                id: true,
                date: true,
                details: true,
                approved: true,
                // Add any other prescription fields you need
              }
            }
          }
        }
      }
    });
  
    if (result) {
      // Add concatenated data for patient
      if (result.patient?.user) {
        result.patient.user.fullAddress = [
          result.patient.user.address,
          `Lat: ${result.patient.user.lat}`,
          `Lng: ${result.patient.user.long}`
        ].filter(Boolean).join(', ');
      }
  
      // Add concatenated data for doctor
      if (result.doctor?.user) {
        result.doctor.user.fullAddress = [
          result.doctor.user.address,
          `Lat: ${result.doctor.user.lat}`,
          `Lng: ${result.doctor.user.long}`
        ].filter(Boolean).join(', ');
      }
  
      // Add combined name field if needed
      if (result.patient?.user) {
        result.patient.user.fullName = `${result.patient.user.firstname} ${result.patient.user.lastname}`.trim();
      }
      
      if (result.doctor?.user) {
        result.doctor.user.fullName = `${result.doctor.user.firstname} ${result.doctor.user.lastname}`.trim();
      }
  
      // Handle prescriptions properly
      if (result.doctor?.prescriptions && result.doctor.prescriptions.length > 0) {
        // Create a formatted string for each prescription
        const formattedPrescriptions = result.doctor.prescriptions.map(prescription => {
          return `${prescription.id} ${prescription.details}${prescription.approved ? ', Approved' : ''}`.trim();
        });
        
        // Store the formatted prescription strings
        result.doctor.prescriptionSummaries = formattedPrescriptions.join(' | ');
      } else {
        result.doctor.prescriptionSummaries = "";
      }
    }
    
    return result;
  }

  // UPDATED METHOD: Get pending requests with pagination
  static async getPendingRequests(doctorId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.doctorPatientRequest.count({
      where: {
        doctorId: doctorId,
        status: 'PENDING'
      }
    });

    // Get paginated data
    const requests = await prisma.doctorPatientRequest.findMany({
      where: {
        doctorId: doctorId,
        status: 'PENDING'
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true,
                profilePhoto: true,
                gender: true,
                dateOfBirth: true
              }
            },
            medicalRecord: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitInt
    });

    // Format requests
    const formattedRequests = requests.map(request => ({
      id: request.id,
      patientId: request.patientId,
      doctorId: request.doctorId,
      name: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
      email: request.patient.user.email,
      profilePhoto: request.patient.user.profilePhoto,
      gender: request.patient.user.gender,
      dateOfBirth: request.patient.user.dateOfBirth,
      status: request.status,
      message: request.message,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    return {
      data: formattedRequests,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  // UPDATED METHOD: Get all requests with pagination
  static async getAllRequests(doctorId, page = 1, limit = 10, status = null) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Build where clause
    const whereClause = {
      doctorId: doctorId
    };

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.doctorPatientRequest.count({
      where: whereClause
    });

    // Get paginated data
    const requests = await prisma.doctorPatientRequest.findMany({
      where: whereClause,
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true,
                profilePhoto: true
              }
            },
            medicalRecord: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitInt
    });

    // Format requests
    const formattedRequests = requests.map(request => ({
      id: request.id,
      patientId: request.patientId,
      doctorId: request.doctorId,
      name: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
      email: request.patient.user.email,
      profilePhoto: request.patient.user.profilePhoto,
      status: request.status,
      message: request.message,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt
    }));

    return {
      data: formattedRequests,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  static async endDoctorPatientRelationship(patientId, doctorId) {
    return prisma.doctorPatient.update({
      where: {
        patientId_doctorId: {
          patientId,
          doctorId
        }
      },
      data: {
        active: false,
        endDate: new Date()
      }
    })
  }

  // UPDATED METHOD: Get doctor patients by order with pagination  
  static async doctorPatientbyorder(doctorId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.doctorPatient.count({
      where: {
        doctorId: doctorId,
        active: true
      }
    });

    // Get paginated data
    const doctorPatients = await prisma.doctorPatient.findMany({
      where: {
        doctorId: doctorId,
        active: true
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true,
                profilePhoto: true
              }
            }
          }
        }
      },
      skip,
      take: limitInt
    });

    // Format doctor patients
    const formattedDoctorPatients = doctorPatients.map(dp => ({
      id: dp.id,
      patientId: dp.patientId,
      doctorId: dp.doctorId,
      name: `${dp.patient.user.firstname} ${dp.patient.user.lastname}`,
      email: dp.patient.user.email,
      profilePhoto: dp.patient.user.profilePhoto,
      startDate: dp.startDate,
      createdAt: dp.createdAt,
      active: dp.active
    }));

    return {
      data: formattedDoctorPatients,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  // UPDATED METHOD: Get doctor medical records with pagination
  static async doctormedicalrecords(doctorId, page = 1, limit = 10) {
    try {
      // Calculate pagination values
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);
      const skip = (pageInt - 1) * limitInt;

      // Get total count for pagination
      const totalCount = await prisma.medicalRecord.count({
        where: { doctorId }
      });

      // Get paginated data
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { doctorId },
        orderBy: { recordDate: 'desc' },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                  email: true,
                  profilePhoto: true
                }
              }
            }
          }
        },
        skip,
        take: limitInt
      });

      // Format medical records
      const formattedRecords = medicalRecords.map(record => ({
        id: record.id,
        patientId: record.patientId,
        doctorId: record.doctorId,
        patientName: `${record.patient.user.firstname} ${record.patient.user.lastname}`,
        email: record.patient.user.email,
        profilePhoto: record.patient.user.profilePhoto,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        recordDate: record.recordDate,
        notes: record.notes,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

      return {
        data: formattedRecords,
        pagination: {
          total: totalCount,
          page: pageInt,
          limit: limitInt,
          pages: Math.ceil(totalCount / limitInt)
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch doctor's medical records: ${error.message}`);
    }
  }

  // NEW METHOD: Get doctor dashboard stats
  static async getDoctorDashboardStats(doctorId) {
    try {
      // Get total patients count (patients with active relationship with this doctor)
      const totalPatientsCount = await prisma.patient.count({
        where: {
          doctors: {
            some: {
              doctorId: doctorId,
              active: true
            }
          }
        }
      });

      // Get pending requests count
      const pendingRequestsCount = await prisma.doctorPatientRequest.count({
        where: {
          doctorId: doctorId,
          status: 'PENDING'
        }
      });

      // Get total medical records created by this doctor
      const medicalRecordsCount = await prisma.medicalRecord.count({
        where: {
          doctorId: doctorId
        }
      });

      // Get most recent patient
      const mostRecentPatient = await prisma.doctorPatient.findFirst({
        where: {
          doctorId: doctorId,
          active: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                  email: true,
                  profilePhoto: true
                }
              }
            }
          }
        }
      });

      // Format most recent patient data
      const formattedRecentPatient = mostRecentPatient ? {
        id: mostRecentPatient.patient.id,
        name: `${mostRecentPatient.patient.user.firstname} ${mostRecentPatient.patient.user.lastname}`,
        email: mostRecentPatient.patient.user.email,
        profilePhoto: mostRecentPatient.patient.user.profilePhoto,
        startDate: mostRecentPatient.startDate
      } : null;

      // Get recent requests (last 5)
      const recentRequests = await prisma.doctorPatientRequest.findMany({
        where: {
          doctorId: doctorId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true
                }
              }
            }
          }
        }
      });

      // Format recent requests
      const formattedRecentRequests = recentRequests.map(request => ({
        id: request.id,
        patientId: request.patientId,
        patientName: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
        status: request.status,
        createdAt: request.createdAt
      }));

      return {
        totalPatients: totalPatientsCount,
        pendingRequests: pendingRequestsCount,
        medicalRecordsCount: medicalRecordsCount,
        mostRecentPatient: formattedRecentPatient,
        recentRequests: formattedRecentRequests
      };
    } catch (error) {
      console.error('Error fetching doctor dashboard stats:', error);
      throw error;
    }
  }

  // NEW METHOD: Search doctor patients
  static async searchPatients(doctorId, name = '', page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc') {
    // Validate inputs
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }

    // Convert page and limit to integers
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    try {
      // Build the where clause for the query
      const whereClause = {
        doctorId: doctorId,
        active: true,
      };

      // Add name search condition if provided
      if (name && name.trim() !== '') {
        whereClause.patient = {
          user: {
            OR: [
              { firstname: { contains: name, mode: 'insensitive' } },
              { lastname: { contains: name, mode: 'insensitive' } },
              // Handle multi-word search
              ...name.split(' ').filter(part => part.trim() !== '').map(part => ({
                OR: [
                  { firstname: { contains: part, mode: 'insensitive' } },
                  { lastname: { contains: part, mode: 'insensitive' } }
                ]
              }))
            ]
          }
        };
      }

      // Determine the orderBy configuration
      const orderBy = {};
      if (sortBy === 'name') {
        orderBy.patient = {
          user: {
            lastname: sortOrder
          }
        };
      } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'startDate') {
        orderBy.startDate = sortOrder;
      }

      // Count total records for pagination
      const totalCount = await prisma.doctorPatient.count({
        where: whereClause
      });

      // Execute query with pagination
      const doctorPatients = await prisma.doctorPatient.findMany({
        where: whereClause,
        include: {
          patient: {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                  email: true,
                  telephoneNumber: true,
                  gender: true,
                  profilePhoto: true,
                  dateOfBirth: true,
                },
              },
            },
          },
        },
        orderBy: orderBy || { createdAt: 'desc' },
        skip: skip,
        take: limitInt
      });

      // Format the response data
      const patients = doctorPatients.map((dp) => ({
        id: dp.patient.id,
        userId: dp.patient.userId,
        name: `${dp.patient.user.firstname} ${dp.patient.user.lastname}`,
        email: dp.patient.user.email,
        gender: dp.patient.user.gender,
        profilePhoto: dp.patient.user.profilePhoto,
        telephoneNumber: dp.patient.user.telephoneNumber,
        dateOfBirth: dp.patient.user.dateOfBirth,
        bloodType: dp.patient.bloodType,
        allergies: dp.patient.allergies,
        chronicDiseases: dp.patient.chronicDiseases,
        role: 'PATIENT',
        relationshipId: dp.id,
        startDate: dp.startDate,
        active: dp.active,
        createdAt: dp.createdAt
      }));

      // Return data with pagination info
      return {
        data: patients,
        pagination: {
          total: totalCount,
          page: pageInt,
          limit: limitInt,
          pages: Math.ceil(totalCount / limitInt)
        }
      };
    } catch (error) {
      console.error('Search patients error:', error);
      throw error;
    }
  }
}