import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const MedicalRecordService = {
  /**
   * Create a new medical record
   * @param {Object} data - Medical record data
   * @returns {Promise<Object>} Created medical record
   */
  create: async (data) => {
    try {
      const medicalRecord = await prisma.medicalRecord.create({
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
          nurses: {
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
          nurses: {
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
          nurses: {
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
   * @param {string} patientId - Patient ID
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of patient's medical records
   */
  findByPatientId: async (patientId, options = { skip: 0, take: 10 }) => {
    try {
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
          nurses: {
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
      throw new Error(`Failed to fetch patient's medical records: ${error.message}`);
    }
  },

  /**
   * Get medical records created by a specific doctor
   * @param {string} doctorId - Doctor ID
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of doctor's medical records
   */
  findByDoctorId: async (doctorId, options = { skip: 0, take: 10 }) => {
    try {
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
          }
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to fetch doctor's medical records: ${error.message}`);
    }
  },

  /**
   * Get medical records managed by a specific nurse
   * @param {string} nurseId - Nurse ID
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object[]>} List of nurse's medical records
   */
  findByNurseId: async (nurseId, options = { skip: 0, take: 10 }) => {
    try {
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: { nurseId },
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
          }
        }
      });
      return medicalRecords;
    } catch (error) {
      throw new Error(`Failed to fetch nurse's medical records: ${error.message}`);
    }
  },

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
          nurses: {
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
          nurses: {
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
          nurses: {
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
  }
};