import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const MedicalRecordService = {
  /**
   * Create a new medical record
   * @param {Object} data - Medical record data
   * @returns {Promise<Object>} Created medical record
   */
  create: async (data, req) => {
    try {
      // Clean up the data to avoid foreign key constraint errors
      const cleanData = { ...data };
      
      // Remove direct ID fields that should be relationships
      const patientId = cleanData.patientId;
      delete cleanData.patientId;
      
      let doctorId = cleanData.doctorId;  // Changed to let
      delete cleanData.doctorId;
      
      let nurseId = cleanData.nurseId;    // Changed to let
      delete cleanData.nurseId;

      // Get doctorId from authenticated user if available
      if (req?.user?.doctor?.id) {
        doctorId = req.user.doctor.id;
      } else if (doctorId) {
        // Verify the doctor exists
        const doctorExists = await prisma.doctor.findUnique({
          where: { id: doctorId }
        });
        
        if (!doctorExists) {
          throw new Error("Doctor with the provided ID does not exist");
        }
      }
      
      // Check if nurseId exists, if provided
      if (req?.user?.nurse?.id) {
        nurseId = req.user.nurse.id;
      } else if (nurseId) {
        // Ensure nurseId is a string, not an array
        if (Array.isArray(nurseId)) {
          throw new Error("nurseId must be a single string value, not an array");
        }
        
        const nurseExists = await prisma.nurse.findUnique({
          where: { id: nurseId }
        });
        
        if (!nurseExists) {
          throw new Error("Nurse with the provided ID does not exist");
        }
      }
      
      // Validate that patientId exists (required field)
      if (!patientId) {
        throw new Error("Patient ID is required");
      }
      
      const patientExists = await prisma.patient.findUnique({
        where: { id: patientId }
      });
      
      if (!patientExists) {
        throw new Error("Patient with the provided ID does not exist");
      }

      // Prepare the create data object with proper relations
      const createData = {
        ...cleanData,
        patient: { connect: { id: patientId } },
        ...(doctorId && { doctor: { connect: { id: doctorId } } }),
        ...(nurseId && { nurse: { connect: { id: nurseId } } })
      };

      const medicalRecord = await prisma.medicalRecord.create({
        data: createData,
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
          },
          doctor: doctorId ? {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                }
              }
            }
          } : undefined,
          nurse: nurseId ? {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                }
              }
            }
          } : undefined
        }
      });
      
      return medicalRecord;
    } catch (error) {
      throw new Error(`Failed to create medical record: ${error.message}`);
    }
  },

  /**
   * Get a medical record by ID
  * @param {string} id - Medical record ID
   * @returns {Promise<Object|null>} Medical record or null if not found
   */
  findById: async (id) => {
    try {
      const medicalRecord = await prisma.medicalRecord.findUnique({
        where: { id },
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
        }
      });
      return medicalRecord;
    } catch (error) {
      throw new Error(`Failed to find medical record: ${error.message}`);
    }
  },


  /**
   * Find medical records with filters
  * @param {Object} filters - Filter conditions
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of medical records
   */
  findMany: async (filters = {}, options = { skip: 0, take: 10 }) => {
    try {
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: filters,
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
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
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to fetch medical records: ${error.message}`);
    }
  },


  /**
   * Get medical records for a specific patient
  * Get medical records created by the authenticated doctor
   * @param {Object} req - Request object containing authenticated user
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of doctor's medical records
   */
  findByAuthenticatedDoctor: async (req, options = { skip: 0, take: 10 }) => {
    try {
      if (!req?.user?.doctor?.id) {
        throw new Error("Authenticated user is not a doctor");
      }
      
      const doctorId = req.user.doctor.id;
      
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { doctorId },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
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
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to fetch doctor's medical records: ${error.message}`);
    }
  },


  /**
   * Get medical records created by a specific doctor


  /**
   * Get medical records managed by a specific nurse


  /**
   * Update a medical record
   * @param {string} id - Medical record ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated medical record
   */
  update: async (id, data) => {
    try {
      const updatedRecord = await prisma.medicalRecord.update({
        where: { id },
        data,
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
        }
      });
      return updatedRecord;
    } catch (error) {
      throw new Error(`Failed to update medical record: ${error.message}`);
    }
  },

  /**
   * Delete a medical record
   * @param {string} id - Medical record ID
   * @returns {Promise<Object>} Deleted medical record
   */
  delete: async (id) => {
    try {
      const deletedRecord = await prisma.medicalRecord.delete({
        where: { id }
      });
      return deletedRecord;
    } catch (error) {
      throw new Error(`Failed to delete medical record: ${error.message}`);
    }
  },

  /**
   * Count medical records with optional filters
   * @param {Object} filters - Filter conditions
   * @returns {Promise<number>} Count of medical records
   */
  count: async (filters = {}) => {
    try {
      const count = await prisma.medicalRecord.count({
        where: filters
      });
      return count;
    } catch (error) {
      throw new Error(`Failed to count medical records: ${error.message}`);
    }
  },

  /**
   * Search medical records by diagnosis or treatment
   * @param {string} searchTerm - Search term
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of matching medical records
   */
  search: async (searchTerm, options = { skip: 0, take: 10 }) => {
    try {
      const medicalRecords = await prisma.medicalRecord.findMany({
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
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to search medical records: ${error.message}`);
    }
  },

  /**
   * Get medical records created within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of medical records within date range
   */
  findByDateRange: async (startDate, endDate, options = { skip: 0, take: 10 }) => {
    try {
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: {
          recordDate: {
            gte: startDate,
            lte: endDate
          }
        },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
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
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to fetch medical records by date range: ${error.message}`);
    }
  },
  findByAuthenticatedPatient: async (req, options = { skip: 0, take: 10 }) => {
    try {
      if (!req?.user?.patient?.id) {
        throw new Error("Authenticated user is not a patient");
      }
      
      const patientId = req.user.patient.id;
      
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { patientId },
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { recordDate: 'desc' },
        include: {
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
          },
          patient: {
            include: {
              user: {
                select: {
                  firstname: true,
                  lastname: true,
                }
              }
            }
          }
        }
      });

      // Return empty array if no records found
      if (!medicalRecords || medicalRecords.length === 0) {
        return [];
      }

      // Map the results to concatenate names and structure the response
      const mappedRecords = medicalRecords.map(record => ({
        id: record.id,
        recordDate: record.recordDate,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        notes: record.notes,
        doctor: record.doctor ? {
          id: record.doctor.id,
          fullName: `${record.doctor.user.firstname} ${record.doctor.user.lastname}`
        } : null,
        nurse: record.nurse ? record.nurse.map(nurse => ({
          id: nurse.id,
          fullName: `${nurse.user.firstname} ${nurse.user.lastname}`
        })) : [],
        patient: record.patient ? {
          id: record.patient.id,
          fullName: `${record.patient.user.firstname} ${record.patient.user.lastname}`
        } : null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));

      return mappedRecords;
    } catch (error) {
      throw new Error(`Failed to fetch patient's medical records: ${error.message}`);
    }
  },
};