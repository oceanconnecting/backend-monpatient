import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Helper functions
function getDoctorId(req, submittedDoctorId) {
  // Use authenticated doctor if available
  if (req?.user?.doctor?.id) {
    return req.user.doctor.id;
  }
  
  // Otherwise use submitted ID
  return submittedDoctorId;
}

async function getNurseId(req, submittedNurseId) {
  // Use authenticated nurse if available
  if (req?.user?.nurse?.id) {
    return req.user.nurse.id;
  }
  
  // Handle nurse validation if ID provided
  if (submittedNurseId) {
    if (Array.isArray(submittedNurseId)) {
      throw new Error("nurseId must be a single string value, not an array");
    }
    
    const nurseExists = await prisma.nurse.findUnique({
      where: { id: submittedNurseId }
    });
    
    if (!nurseExists) {
      throw new Error("Nurse with the provided ID does not exist");
    }
    
    return submittedNurseId;
  }
  
  return null;
}

// Standard include object for consistent entity relationships
const standardInclude = {
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
  },
  doctor: {
    include: {
      user: {
        select: {
          firstname: true,
          lastname: true,
        }
      }
    }
  },
  nurse: {
    include: {
      user: {
        select: {
          firstname: true,
          lastname: true,
        }
      }
    }
  }
};

// Helper to get conditional includes based on available IDs
function getConditionalIncludes(doctorId, nurseId) {
  return {
    patient: standardInclude.patient,
    ...(doctorId ? { doctor: standardInclude.doctor } : {}),
    ...(nurseId ? { nurse: standardInclude.nurse } : {})
  };
}

// Standardized error wrapper
const executeQuery = async (operation, errorMessage) => {
  try {
    return await operation();
  } catch (error) {
    throw new Error(`${errorMessage}: ${error.message}`);
  }
};

export const MedicalRecordService = {
  /**
   * Create a new medical record
   * @param {Object} data - Medical record data
   * @returns {Promise<Object>} Created medical record
   */
  create: async (data, req) => {
    return executeQuery(async () => {
      // Clean up the data to avoid foreign key constraint errors
      const cleanData = { ...data };
      // Extract and remove direct ID fields that should be relationships
      const patientId = cleanData.patientId;
      const submittedDoctorId = cleanData.doctorId;
      delete cleanData.patientId;
      // Keep doctorId in the cleanData object
      
      // Validate and handle patient data (required field)
      if (!patientId) {
        throw new Error("Patient ID is required");
      }
      const patientExists = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      if (!patientExists) {
        throw new Error("Patient with the provided ID does not exist");
      }
      
      // Determine doctorId
      const doctorId = getDoctorId(req, submittedDoctorId);
      
      // Prepare the create data object with proper relations
      const createData = {
        ...cleanData,
        patient: { connect: { id: patientId } },
        ...(doctorId && { doctor: { connect: { id: doctorId } } })
        // Removed nurse connection
      };
      
      const medicalRecord = await prisma.medicalRecord.create({
        data: createData,
        include: getConditionalIncludes(doctorId) // Updated to only include doctorId
      });
      
      return medicalRecord;
    }, "Failed to create medical record");
  },

  /**
   * Get a medical record by ID
   * @param {string} id - Medical record ID
   * @returns {Promise<Object|null>} Medical record or null if not found
   */
  findById: async (id) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.findUnique({
        where: { id },
        include: standardInclude
      });
    }, "Failed to find medical record");
  },

  /**
   * Find medical records with filters
   * @param {Object} filters - Filter conditions
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of medical records
   */
  findMany: async (filters = {}, options = { skip: 0, take: 10 }) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.findMany({
        where: filters,
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
        include: standardInclude
      });
    }, "Failed to fetch medical records");
  },

  /**
   * Get medical records created by the authenticated doctor


  /**
   * Update a medical record
   * @param {string} id - Medical record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated medical record
   */
  update: async (id, data) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.update({
        where: { id },
        data,
        include: standardInclude
      });
    }, "Failed to update medical record");
  },

  /**
   * Delete a medical record
   * @param {string} id - Medical record ID
   * @returns {Promise<Object>} Deleted medical record
   */
  delete: async (id) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.delete({
        where: { id }
      });
    }, "Failed to delete medical record");
  },

  /**
   * Count medical records with optional filters
   * @param {Object} filters - Filter conditions
   * @returns {Promise<number>} Count of medical records
   */
  count: async (filters = {}) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.count({
        where: filters
      });
    }, "Failed to count medical records");
  },

  /**
   * Search medical records by diagnosis or treatment
   * @param {string} searchTerm - Search term
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of matching medical records
   */
  search: async (searchTerm, options = { skip: 0, take: 10 }) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.findMany({
        where: {
          OR: [
            { diagnosis: { contains: searchTerm, mode: 'insensitive' } },
            { treatment: { contains: searchTerm, mode: 'insensitive' } },
            { notes: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
        include: standardInclude
      });
    }, "Failed to search medical records");
  },

  /**
   * Get medical records created within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of medical records within date range
   */
  findByDateRange: async (startDate, endDate, options = { skip: 0, take: 10 }) => {
    return executeQuery(async () => {
      return await prisma.medicalRecord.findMany({
        where: {
          recordDate: {
            gte: startDate,
            lte: endDate
          }
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
        include: standardInclude
      });
    }, "Failed to fetch medical records by date range");
  },
  
  /**
   * Get medical records for the authenticated patient
   * @param {Object} req - Request object containing authenticated user
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of patient's medical records
   */
  findByAuthenticatedPatient: async (req, options = { skip: 0, take: 10 }) => {
    return executeQuery(async () => {
      if (!req?.user?.patient?.id) {
        throw new Error("Authenticated user is not a patient");
      }
      
      const patientId = req.user.patient.id;
      
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { patientId },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
        include: standardInclude
      });

      // Return empty array if no records found
      if (!medicalRecords || medicalRecords.length === 0) {
        return [];
      }

      // Map the results to concatenate names and structure the response
      return medicalRecords.map(record => ({
        id: record.id,
        recordDate: record.recordDate,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        notes: record.notes,
        doctor: record.doctor ? {
          id: record.doctor.id,
          fullName: `${record.doctor.user.firstname} ${record.doctor.user.lastname}`
        } : null,
        nurse: record.nurse ? {
          id: record.nurse.id,
          fullName: `${record.nurse.user.firstname} ${record.nurse.user.lastname}`
        } : null,
        patient: record.patient ? {
          id: record.patient.id,
          fullName: `${record.patient.user.firstname} ${record.patient.user.lastname}`
        } : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));
    }, "Failed to fetch patient's medical records");
  },
};