import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class NurseServiceService {
  // NEW METHOD: Get dashboard stats for a nurse
static async getNurseDashboardStats(nurseId) {
  try {
    // Get total patients count (patients with ACCEPTED requests for this nurse)
    const totalPatientsCount = await prisma.patient.count({
      where: {
        nurseServiceRequests: {
          some: {
            nurseId: nurseId,
            status: 'ACCEPTED'
          }
        }
      }
    });

    // Get requested patients count (patients with REQUESTED status)
    const requestedPatientsCount = await prisma.nurseServiceRequest.count({
      where: {
        nurseId: nurseId,
        status: 'REQUESTED'
      }
    });

    // Get last accepted patient
    const lastAcceptedRequest = await prisma.nurseServiceRequest.findFirst({
      where: {
        nurseId: nurseId,
        status: 'ACCEPTED'
      },
      orderBy: {
        updatedAt: 'desc'
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

    // Format last accepted patient data
    const lastAcceptedPatient = lastAcceptedRequest ? {
      id: lastAcceptedRequest.patient.id,
      name: `${lastAcceptedRequest.patient.user.firstname} ${lastAcceptedRequest.patient.user.lastname}`,
      email: lastAcceptedRequest.patient.user.email,
      profilePhoto: lastAcceptedRequest.patient.user.profilePhoto,
      acceptedAt: lastAcceptedRequest.updatedAt,
      serviceType: lastAcceptedRequest.serviceType
    } : null;

    // Get recent service requests (last 5)
    const recentRequests = await prisma.nurseServiceRequest.findMany({
      where: {
        nurseId: nurseId
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
      patientId: request.patient.id,
      patientName: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
      serviceType: request.serviceType,
      status: request.status,
      createdAt: request.createdAt,
      urgency: request.urgency
    }));

    // Get total count of recent requests for this nurse (not limited to 5)
    const recentRequestsCount = await prisma.nurseServiceRequest.count({
      where: {
        nurseId: nurseId
      }
    });

    return {
      totalPatients: totalPatientsCount,
      requestedPatients: requestedPatientsCount,
      lastAcceptedPatient,
      recentRequests: formattedRecentRequests,
      recentRequestsCount: recentRequestsCount // Added total count of requests
    };
  } catch (error) {
    console.error('Error fetching nurse dashboard stats:', error);
    throw error;
  }
}

  // UPDATED METHOD: Get available requests with pagination
  static async getAvailableRequests(nurseId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.nurseServiceRequest.count({
      where: {
        status: 'REQUESTED',
        nurseId: nurseId
      }
    });

    // Get paginated data
    const requests = await prisma.nurseServiceRequest.findMany({
      where: {
        status: 'REQUESTED',
        nurseId: nurseId
      },
      include: {
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
      },
      orderBy: [
        {
          urgency: 'desc'
        },
        {
          preferredDate: 'asc'
        }
      ],
      skip,
      take: limitInt
    });
  
    const formattedRequests = requests.map(request => {
      const { patient, ...requestData } = request;
      return {
        ...requestData,
        name: `${patient.user.firstname} ${patient.user.lastname}`,
        email: patient.user.email,
        // Keep the original patient data if needed
      };
    });

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

  // UPDATED METHOD: Get patient requests with pagination
  static async getPatientRequests(patientId, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count for pagination
    const totalCount = await prisma.nurseServiceRequest.count({
      where: {
        patientId: patientId
      }
    });

    // Get paginated data
    const requests = await prisma.nurseServiceRequest.findMany({
      where: {
        patientId: patientId
      },
      include: {
        nurse: {
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
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limitInt
    });

    // Format the nurse information in each request
    const formattedRequests = requests.map(request => {
      const { nurse, ...requestData } = request;
      return {
        ...requestData,
        nurse: nurse ? {
          id: nurse.id,
          name: nurse.user ? `${nurse.user.firstname} ${nurse.user.lastname}` : null,
          email: nurse.user ? nurse.user.email : null,
          profilePhoto: nurse.user ? nurse.user.profilePhoto : null,
          rating: nurse.rating
        } : null
      };
    });

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

  // UPDATED METHOD: Get nurse requests with pagination
  static async getNurseRequests(nurseId, page = 1, limit = 10, status = null) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Build where clause
    const whereClause = {
      nurseId: nurseId
    };

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.nurseServiceRequest.count({
      where: whereClause
    });

    // Get paginated data
    const requests = await prisma.nurseServiceRequest.findMany({
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

    // Format the patient information in each request
    const formattedRequests = requests.map(request => {
      const { patient, ...requestData } = request;
      return {
        ...requestData,
        patient: {
          id: patient.id,
          name: `${patient.user.firstname} ${patient.user.lastname}`,
          email: patient.user.email,
          profilePhoto: patient.user.profilePhoto
        }
      };
    });

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

  // UPDATED METHOD: Get nurse patients with pagination
  static async nursePatients(id, page = 1, limit = 10) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Get total count of accepted service requests for pagination
    const totalCount = await prisma.nurseServiceRequest.count({
      where: { 
        nurseId: id,
        status: 'ACCEPTED' 
      }
    });

    // Get paginated service requests
    const serviceRequests = await prisma.nurseServiceRequest.findMany({
      where: { 
        nurseId: id,
        status: 'ACCEPTED' 
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true,
              }
            }
          }
        }
      },
      skip,
      take: limitInt,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Get all nurse visits in one query to reduce database calls
    const nurseVisits = await prisma.nurseVisit.findMany({
      where: {
        nurseId: id,
        patientId: {
          in: serviceRequests.map(req => req.patientId)
        }
      },
      include: {
        patient: true
      }
    });
    
    // Map and format the data
    const formattedPatients = serviceRequests.map((request) => {
      // Filter nurse visits for this specific patient
      const patientVisits = nurseVisits.filter(
        visit => visit.patientId === request.patientId
      );
      
      return {
        id: request.id,
        patientId: request.patient.id,
        userId: request.patient.userId,
        name: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
        email: request.patient.user.email,
        allergies: request.patient.allergies,
        emergencyContactName: request.patient.emergencyContactName,
        emergencyContactNumber: request.patient.emergencyContactPhone,
        serviceRequestId: request.id,
        status: request.status,
        serviceType: request.serviceType,
        nurseVisits: patientVisits.map((visit) => ({
          visitId: visit.id,
          visitDate: visit.visitDate,
          notes: visit.notes,
        })),
        nurseVisitsCount: patientVisits.length,
        createdAt: request.createdAt,
        preferredDate: request.preferredDate,
      };
    });

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

  // UPDATED METHOD: Get nurse visits with pagination
  static async getNurseVisits(nurseId, page = 1, limit = 10, otherFilters = {}) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;
    
    // Build the query with nurseId as primary filter
    const where = {
      nurseId: nurseId
    };
    
    // Apply additional filters if provided
    if (otherFilters.patientId) where.patientId = otherFilters.patientId;
    if (otherFilters.visitId) where.id = otherFilters.visitId;
    if (otherFilters.dateFrom) where.visitDate = { gte: new Date(otherFilters.dateFrom) };
    if (otherFilters.dateTo) {
      where.visitDate = {
        ...where.visitDate,
        lte: new Date(otherFilters.dateTo)
      };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.nurseVisit.count({ where });
    
    // Query nurse visits with relations
    const visits = await prisma.nurseVisit.findMany({
      where,
      include: {
        nurse: {
          include: {
            user: {
              select: {
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
                firstname: true,
                lastname: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      skip,
      take: limitInt
    });
    
    // Format the results
    const formattedVisits = visits.map(visit => ({
      id: visit.id,
      nurseId: visit.nurseId,
      nurseName: visit.nurse ? `${visit.nurse.user.firstname} ${visit.nurse.user.lastname}` : null,
      patientId: visit.patientId,
      patientName: visit.patient ? `${visit.patient.user.firstname} ${visit.patient.user.lastname}` : null,
      visitDate: visit.visitDate,
      notes: visit.notes,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt
    }));
    
    return {
      data: formattedVisits,
      pagination: {
        total: totalCount,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(totalCount / limitInt)
      }
    };
  }

  // UPDATED METHOD: Get requests with pagination
  static async getRequests(nurseId, page = 1, limit = 10, status = null) {
    // Calculate pagination values
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;

    // Build where clause
    const where = {
      nurseId: nurseId
    };

    // Add status filter if provided
    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const totalCount = await prisma.nurseServiceRequest.count({
      where
    });

    // Get paginated data
    const requests = await prisma.nurseServiceRequest.findMany({
      where,
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                telephoneNumber: true,
                gender: true,
                profilePhoto: true,
                dateOfBirth: true,
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

    // Format the data
    const formattedRequests = requests.map(request => {
      const user = request.patient.user;
      return {
        patientId: request.patient.id,
        requestId: request.id,
        name: `${user.firstname} ${user.lastname}`,
        urgency: request.urgency,
        status: request.status,
        description: request.description,
        serviceType: request.serviceType,
        preferredDate: request.preferredDate,
        email: user.email,
        telephoneNumber: user.telephoneNumber,
        gender: user.gender,
        profilePhoto: user.profilePhoto,
        dateOfBirth: user.dateOfBirth
      };
    });

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

  // Rest of original methods remain unchanged
  // patient create service request
  static async createServiceRequest(patientId, requestData, reply) {
    try {
      // First check if both patient and nurse exist
      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!patient) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Patient not found'
        });
      }
      
      const nurse = await prisma.nurse.findUnique({
        where: { id: requestData.nurseId }
      });
      
      if (!nurse) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Nurse not found'
        });
      }  
      return await prisma.nurseServiceRequest.create({
        data: {
          patientId,
          nurseId: requestData.nurseId,
          serviceType: requestData.serviceType,
          description: requestData.description,
          preferredDate: new Date(requestData.preferredDate),
          urgency: requestData.urgency,
        
        },
        include: {
          patient: true,
          nurse: true
        }
      });
    } catch (error) {
      // Add more specific error handling
      if (error.code === 'P2003' && error.meta?.field_name?.includes('nurseId')) {
        return reply.status(400).send({
          error: 'Invalid Reference',
          message: 'The specified nurse does not exist'
        });
      }
      console.error(error);
      throw error;
    }
  }

  // nurse acceptRequest
  static async acceptRequest(requestId, nurseId) {
    const request = await prisma.nurseServiceRequest.findUnique({
      where: { id:requestId }
    })

    if (!request) {
      throw new Error('Service request not found')
    }

    if (request.status !== 'REQUESTED') {
      throw new Error('Service request is no longer available')
    }

    return prisma.nurseServiceRequest.update({
      where: { id: requestId },
      data: {
        nurseId: nurseId,
        status: 'ACCEPTED'
      },
      include: {
        patient: {
          include:{
            user:{
              select:{
                firstname:true,
                lastname:true,
                email:true
              }
            }
          }
        },
        nurse: true
      }
    })
  }

  static async updateRequestStatus(requestId, nurseId, status, notes) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: requestId,
        nurseId: nurseId
      }
    })

    if (!request) {
      throw new Error('Service request not found')
    }

    const data = {
      status,
      ...(notes && { notes }),
      ...(status === 'COMPLETED' && { completedAt: new Date() })
    }

    return prisma.nurseServiceRequest.update({
      where: { id: requestId },
      data,
      include: {
        patient: true,
        nurse: true
      }
    })
  }

  static async rateService(requestId, patientId, rating, feedback) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: requestId,
        patientId: patientId,
        status: 'ACCEPTED'
      }
    });
    
    if (!request) {
      throw new Error('Accepted service request not found');
    }
    
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Update the service request with rating and feedback
    const updatedRequest = await prisma.nurseServiceRequest.update({
      where: { id: requestId },
      data: {
        rating,
        feedback
      }
    });
    
    // Update nurse's average rating
    const nurseRequests = await prisma.nurseServiceRequest.findMany({
      where: {
        nurseId: request.nurseId,
        rating: { not: null }
      },
      select: {
        rating: true
      }
    });
    
    const averageRating = nurseRequests.reduce((acc, curr) => acc + curr.rating, 0) / nurseRequests.length;
    
    await prisma.nurse.update({
      where: { id: request.nurseId },
      data: {
        rating: averageRating
      }
    });
    
    return updatedRequest;
  }

  static async cancelRequest(requestId, patientId) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: requestId,
        patientId: patientId,
        status: { in: ['REQUESTED', 'ACCEPTED'] }
      }
    })

    if (!request) {
      throw new Error('Active service request not found')
    }

    return prisma.nurseServiceRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED'
      }
    })
  }

  static async nursePatientsbyPatientId(id,nurseId) {
    const patient = await prisma.patient.findUnique({
      where: { id: id },
      include: {
        nurseServiceRequests : {
          where: { status: 'ACCEPTED', nurseId: nurseId },
          include: {
            patient: {
              include: {
                user: {
                  select: { firstname: true, lastname: true, email: true,lat:true,long:true,address:true }
                },
                
              }
            },
            nurse:{
             include:{
              user:{
                select:{
                  lat: true,
                  long: true,
                  address: true,
                }
              }
             }
            }
          }
        }
      }
    });
    
    if (!patient) {
      console.error('Patient not found');
      throw new Error('Patient not found');
    }
    
    return patient.nurseServiceRequests.map((request) => ({
      id: request.patient.id,
      requestId: request.id,
      emergencyContactName: request.patient.emergencyContactName,
      emergencyContactPhone: request.patient.emergencyContactPhone,
      name: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
      email: request.patient.user.email,
      serviceRequestId: request.id,
      serviceType: request.serviceType,
      status: request.status,
      createdAt: request.createdAt,
      preferredDate: request.preferredDate,
      longitude: request.patient.user?.long || null,
      latitude: request.patient.user?.lat || null,
      address: request.patient.user?.address || null,
      nurseLongitude: request.nurse.user?.long || null,
      nurseLatitude: request.nurse.user?.lat || null,
      nurseAddress: request.nurse.user?.address || null,
    }));
  }

  static async nursedeletePatientServiceRequest(serviceRequestId) {
    try {
      // 1. Check if the service request exists and belongs to the nurse
      const serviceRequest = await prisma.nurseServiceRequest.findUnique({
        where: { id: serviceRequestId },
        include: {
          patient: {
            include: {
              user: {
                select: { firstname: true, lastname: true, email: true }
              }
            }
          }
        }
      });
  
      if (!serviceRequest) {
        throw new Error('Service request not found');
      }
  
      // 3. Delete the service request
      const deletedRequest = await prisma.nurseServiceRequest.delete({
        where: { id: serviceRequestId }
      });
  
      // 4. Return deleted request info (optional)
      return {
        message: 'Service request deleted successfully',
        deletedRequest: {
          id: deletedRequest.id,
          patientName: `${serviceRequest.patient.user.firstname} ${serviceRequest.patient.user.lastname}`,
          serviceType: deletedRequest.serviceType,
          status: deletedRequest.status,
          deletedAt: new Date()
        }
      };
  
    } catch (error) {
      console.error('Error deleting service request:', error);
      throw new Error(`Failed to delete service request: ${error.message}`);
    }
  }

  static async createVisit(nurseId, patientId, notes) {
    // First find the accepted nurse service request
    const nurseService = await prisma.nurseServiceRequest.findFirst({
      where: { 
        nurseId: nurseId,
        patientId: patientId,
        status: "ACCEPTED" 
      },
      include: {
        nurse: true,    // Include nurse relation
        patient: true   // Include patient relation
      }
    });
    
    if (!nurseService) {
      throw new Error('No accepted service request found for this nurse and patient');
    }
  
    // Create the nurse visit record
    const createVisit = await prisma.nurseVisit.create({
      data: {
        nurseId: nurseId,
        patientId: patientId,
        notes: notes
      }
    });
  
    return createVisit;
  }

  static async updateVisit(nurseId, visitId, updateData) { 
    // Verify the visit exists and belongs to the nurse
    const existingVisit = await prisma.nurseVisit.findFirst({
      where: { 
        id: visitId,
        nurseId: nurseId
      }
    });
    
    if (!existingVisit) {
      throw new Error('Nurse visit not found or not authorized');
    }
    
    // Update the visit
    const updatedVisit = await prisma.nurseVisit.update({
      where: { id: visitId },
      data: updateData,
      include: {
        nurse: true,
        patient: true
      }
    });
    
    return updatedVisit;
  }
  
  static async deleteVisit(nurseId, visitId) {
    // Verify the visit exists and belongs to the nurse
    const existingVisit = await prisma.nurseVisit.findFirst({
      where: { 
        id: visitId,
        nurseId: nurseId
      }
    });
    
    if (!existingVisit) {
      throw new Error('Nurse visit not found or not authorized');
    }
    
    // Delete the visit
    await prisma.nurseVisit.delete({
      where: { id: visitId }
    });
    
    return { success: true, message: 'Nurse visit deleted successfully' };
  }
  static async searchPatient(nurseId, name = '', page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc') {
    // Validate inputs
    if (!nurseId) {
      throw new Error('Nurse ID is required');
    }
  
    // Convert page and limit to integers
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);
    const skip = (pageInt - 1) * limitInt;
  
    try {
      // Build the where clause for the query
      const whereClause = {
        nurseId: nurseId,
        status: 'ACCEPTED',
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
      } else if (sortBy === 'status') {
        orderBy.status = sortOrder;
      }
  
      // Count total records for pagination
      const totalRecords = await prisma.nurseServiceRequest.count({
        where: whereClause
      });
  
      // Execute query with pagination
      const serviceRequests = await prisma.nurseServiceRequest.findMany({
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
        orderBy: orderBy,
        skip: skip,
        take: limitInt
      });
  
      // Format the response data
      const patients = serviceRequests.map((request) => ({
        id: request?.patientId,
        userId: request.patient.userId,
        name: `${request.patient.user.firstname} ${request.patient.user.lastname}`,
        email: request.patient.user.email,
        gender: request.patient.user.gender,
        profilePhoto: request.patient.user.profilePhoto,
        telephoneNumber: request.patient.user.telephoneNumber,
        dateOfBirth: request.patient.user.dateOfBirth,
        bloodType: request.patient.bloodType,
        allergies: request.patient.allergies,
        chronicDiseases: request.patient.chronicDiseases,
        role: 'PATIENT',
        serviceRequestId: request.id,
        serviceType: request.serviceType,
        status: request.status,
        createdAt: request.createdAt,
        preferredDate: request.preferredDate,
      }));
  
      // Return data with pagination info
      return {
        data: patients,
        pagination: {
          total: totalRecords,
          page: pageInt,
          limit: limitInt,
          pages: Math.ceil(totalRecords / limitInt)
        }
      };
    } catch (error) {
      console.error('Search patient error:', error);
      throw error;
    }
  }
  

 
}