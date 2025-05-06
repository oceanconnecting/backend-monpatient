// src/services/scheduleService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class ScheduleService {
  /**
   * Create a new schedule
   * @param {Object} scheduleData - Schedule data including doctorId, nurseId, patientId, taskId, and other schedule details
   * @returns {Promise<Object>} Created schedule with related records
   */
  async createSchedule(scheduleData) {
    try {
      const data = {
        title: scheduleData.title,
        description: scheduleData.description,
        startTime: new Date(scheduleData.startTime),
        endTime: new Date(scheduleData.endTime),
        status: scheduleData.status || 'SCHEDULED',
        isRecurring: scheduleData.isRecurring || false,
        recurrencePattern: scheduleData.recurrencePattern
      };

      // Connect doctor if doctorId is provided
      if (scheduleData.doctorId) {
        data.doctor = {
          connect: { id: scheduleData.doctorId }
        };
      }

      // Connect nurse if nurseId is provided
      if (scheduleData.nurseId) {
        data.nurse = {
          connect: { id: scheduleData.nurseId }
        };
      }

      // Connect patient if patientId is provided
      if (scheduleData.patientId) {
        data.patient = {
          connect: { id: scheduleData.patientId }
        };
      }

      // Connect task if taskId is provided
      if (scheduleData.taskId) {
        data.task = {
          connect: { id: scheduleData.taskId }
        };
      }

      const schedule = await prisma.schedule.create({
        data,
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        }
      });

      // Create notifications for relevant parties
      if (schedule.nurseId) {
        await prisma.notification.create({
          data: {
            userId: schedule.nurse.userId,
            type: 'SCHEDULE_CREATED',
            title: 'New Schedule Created',
            message: `You have been scheduled for: ${schedule.title}`,
            metadata: {
              scheduleId: schedule.id,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          }
        });
      }

      if (schedule.doctorId && schedule.nurseId) {
        await prisma.notification.create({
          data: {
            userId: schedule.doctor.userId,
            type: 'SCHEDULE_CREATED',
            title: 'Schedule Created',
            message: `Schedule created with ${schedule.nurse.user.firstname} ${schedule.nurse.user.lastname} for ${schedule.title}`,
            metadata: {
              scheduleId: schedule.id,
              nurseId: schedule.nurseId,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          }
        });
      }

      return schedule;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  /**
   * Get all schedules
   * @param {Object} filters - Optional filters for schedules (date range, status, etc)
   * @returns {Promise<Array>} List of all schedules
   */
  async getAllSchedules(filters = {}) {
    try {
      const whereClause = {};
      
      // Apply date range filter if provided
      if (filters.startDate && filters.endDate) {
        whereClause.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }
      
      // Apply status filter if provided
      if (filters.status) {
        whereClause.status = filters.status;
      }

      return await prisma.schedule.findMany({
        where: whereClause,
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    } catch (error) {
      console.error('Error getting all schedules:', error);
      throw error;
    }
  }

  /**
   * Get schedules by doctor ID
   * @param {string} doctorId - Doctor ID to filter schedules
   * @param {Object} filters - Optional filters for schedules
   * @returns {Promise<Array>} List of schedules for the doctor
   */
  async getSchedulesByDoctorId(doctorId, filters = {}) {
    try {
      const whereClause = {
        doctorId: doctorId
      };
      
      // Apply date range filter if provided
      if (filters.startDate && filters.endDate) {
        whereClause.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }
      
      // Apply status filter if provided
      if (filters.status) {
        whereClause.status = filters.status;
      }

      return await prisma.schedule.findMany({
        where: whereClause,
        include: {
          nurse: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    } catch (error) {
      console.error(`Error getting schedules for doctor ID ${doctorId}:`, error);
      throw error;
    }
  }

  /**
   * Get schedules by nurse ID
   * @param {string} nurseId - Nurse ID to filter schedules
   * @param {Object} filters - Optional filters for schedules
   * @returns {Promise<Array>} List of schedules for the nurse
   */
  async getSchedulesByNurseId(nurseId, filters = {}) {
    try {
      const whereClause = {
        nurseId: nurseId
      };
      
      // Apply date range filter if provided
      if (filters.startDate && filters.endDate) {
        whereClause.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }
      
      // Apply status filter if provided
      if (filters.status) {
        whereClause.status = filters.status;
      }

      return await prisma.schedule.findMany({
        where: whereClause,
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    } catch (error) {
      console.error(`Error getting schedules for nurse ID ${nurseId}:`, error);
      throw error;
    }
  }

  /**
   * Get schedules by patient ID
   * @param {string} patientId - Patient ID to filter schedules
   * @param {Object} filters - Optional filters for schedules
   * @returns {Promise<Array>} List of schedules for the patient
   */
  async getSchedulesByPatientId(patientId, filters = {}) {
    try {
      const whereClause = {
        patientId: patientId
      };
      
      // Apply date range filter if provided
      if (filters.startDate && filters.endDate) {
        whereClause.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }
      
      // Apply status filter if provided
      if (filters.status) {
        whereClause.status = filters.status;
      }

      return await prisma.schedule.findMany({
        where: whereClause,
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          task: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    } catch (error) {
      console.error(`Error getting schedules for patient ID ${patientId}:`, error);
      throw error;
    }
  }

  /**
   * Get schedules by task ID
   * @param {string} taskId - Task ID to filter schedules
   * @returns {Promise<Array>} List of schedules for the task
   */
  async getSchedulesByTaskId(taskId) {
    try {
      return await prisma.schedule.findMany({
        where: {
          taskId: taskId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          patient: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });
    } catch (error) {
      console.error(`Error getting schedules for task ID ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get schedule by ID
   * @param {string} scheduleId - Schedule ID to find
   * @returns {Promise<Object|null>} Schedule object or null if not found
   */
  async getScheduleById(scheduleId) {
    try {
      return await prisma.schedule.findUnique({
        where: {
          id: scheduleId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        }
      });
    } catch (error) {
      console.error(`Error getting schedule with ID ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Update schedule status
   * @param {string} scheduleId - ID of the schedule to update
   * @param {string} status - New status value (SCHEDULED, COMPLETED, CANCELLED)
   * @returns {Promise<Object>} Updated schedule
   */
  async updateScheduleStatus(scheduleId, status) {
    try {
      const updatedSchedule = await prisma.schedule.update({
        where: {
          id: scheduleId
        },
        data: {
          status: status
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          patient: true,
          task: true
        }
      });

      // Create notifications for status updates
      if (updatedSchedule.nurseId && updatedSchedule.doctorId) {
        // Notify doctor about nurse's schedule status update
        await prisma.notification.create({
          data: {
            userId: updatedSchedule.doctor.userId,
            type: `SCHEDULE_${status}`,
            title: `Schedule ${status.toLowerCase()}`,
            message: `${updatedSchedule.nurse.user.firstname} ${updatedSchedule.nurse.user.lastname} has ${status === 'COMPLETED' ? 'completed' : status === 'CANCELLED' ? 'cancelled' : 'updated'} the schedule: ${updatedSchedule.title}`,
            metadata: {
              scheduleId: updatedSchedule.id,
              nurseId: updatedSchedule.nurseId
            }
          }
        });
      }

      return updatedSchedule;
    } catch (error) {
      console.error(`Error updating schedule status for schedule ID ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Update schedule details
 * Update schedule details
   * @param {string} scheduleId - ID of the schedule to update
   * @param {Object} scheduleData - Updated schedule data
   * @returns {Promise<Object>} Updated schedule
   */
  async updateSchedule(scheduleId, scheduleData) {
    try {
      // Prepare the data for update
      const data = this._prepareScheduleUpdateData(scheduleData);
      
      // Update the schedule
      const updatedSchedule = await prisma.schedule.update({
        where: { id: scheduleId },
        data,
        include: this._getScheduleIncludeOptions()
      });

      // Create notifications if needed
      await this._createScheduleUpdateNotifications(updatedSchedule, scheduleData);

      return updatedSchedule;
    } catch (error) {
      console.error(`Error updating schedule with ID ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Prepare data object for schedule update
   * @private
   * @param {Object} scheduleData - Data to update
   * @returns {Object} Prisma-compatible update data object
   */
  _prepareScheduleUpdateData(scheduleData) {
    const data = {};
    
    // Handle basic fields
    this._updateBasicFields(data, scheduleData);
    
    // Handle relationship fields
    this._updateRelationshipFields(data, scheduleData);
    
    return data;
  }

  /**
   * Update basic schedule fields
   * @private
   * @param {Object} data - Data object to modify
   * @param {Object} scheduleData - Source data
   */
  _updateBasicFields(data, scheduleData) {
    const basicFields = [
      { key: 'title', transform: null },
      { key: 'description', transform: null },
      { key: 'startTime', transform: (val) => new Date(val) },
      { key: 'endTime', transform: (val) => new Date(val) },
      { key: 'status', transform: null },
      { key: 'isRecurring', transform: null },
      { key: 'recurrencePattern', transform: null }
    ];

    for (const field of basicFields) {
      if (scheduleData[field.key] !== undefined) {
        data[field.key] = field.transform 
          ? field.transform(scheduleData[field.key]) 
          : scheduleData[field.key];
      }
    }
  }

  /**
   * Update relationship fields
   * @private
   * @param {Object} data - Data object to modify
   * @param {Object} scheduleData - Source data
   */
  _updateRelationshipFields(data, scheduleData) {
    const relationFields = [
      { key: 'doctorId', relationName: 'doctor' },
      { key: 'nurseId', relationName: 'nurse' },
      { key: 'patientId', relationName: 'patient' },
      { key: 'taskId', relationName: 'task' }
    ];

    for (const field of relationFields) {
      if (scheduleData[field.key] !== undefined) {
        data[field.relationName] = scheduleData[field.key]
          ? { connect: { id: scheduleData[field.key] } }
          : { disconnect: true };
      }
    }
  }

  /**
   * Get standard include options for schedule queries
   * @private
   * @returns {Object} Prisma include options
   */
  _getScheduleIncludeOptions() {
    return {
      doctor: {
        include: {
          user: true
        }
      },
      nurse: {
        include: {
          user: true
        }
      },
      patient: true,
      task: true
    };
  }

  /**
   * Create notifications for schedule updates if needed
   * @private
   * @param {Object} updatedSchedule - The updated schedule
   * @param {Object} scheduleData - The data that was updated
   * @returns {Promise<void>}
   */
  async _createScheduleUpdateNotifications(updatedSchedule, scheduleData) {
    // Check if there are significant changes that require notification
    const significantChanges = scheduleData.startTime || scheduleData.endTime || scheduleData.status;
    
    if (significantChanges && updatedSchedule.nurseId) {
      await prisma.notification.create({
        data: {
          userId: updatedSchedule.nurse.userId,
          type: 'SCHEDULE_UPDATED',
          title: 'Schedule Updated',
          message: `The schedule "${updatedSchedule.title}" has been updated.`,
          metadata: {
            scheduleId: updatedSchedule.id,
            startTime: updatedSchedule.startTime,
            endTime: updatedSchedule.endTime
          }
        }
      });
    }
  }

  /**
   * Delete schedule
   * @param {string} scheduleId - ID of the schedule to delete
   * @returns {Promise<Object>} Deleted schedule
   */
  async deleteSchedule(scheduleId) {
    try {
      // Get the schedule before deleting for notification purposes
      const schedule = await prisma.schedule.findUnique({
        where: {
          id: scheduleId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          }
        }
      });

      // Delete the schedule
      const deletedSchedule = await prisma.schedule.delete({
        where: {
          id: scheduleId
        }
      });

      // Notify affected parties
      if (schedule.nurseId) {
        await prisma.notification.create({
          data: {
            userId: schedule.nurse.userId,
            type: 'SCHEDULE_DELETED',
            title: 'Schedule Deleted',
            message: `The schedule "${schedule.title}" has been deleted.`,
            metadata: {
              title: schedule.title,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            }
          }
        });
      }

      return deletedSchedule;
    } catch (error) {
      console.error(`Error deleting schedule with ID ${scheduleId}:`, error);
      throw error;
    }
  }

  /**
   * Create schedules for recurring tasks
   * @param {string} taskId - Task ID to create schedules for
   * @param {Object} recurringData - Data for recurring schedules
   * @returns {Promise<Array>} Created schedules
   */
  async createRecurringSchedules(taskId, recurringData) {
    try {
      const task = await prisma.task.findUnique({
        where: {
          id: taskId
        },
        include: {
          doctor: true,
          nurse: true
        }
      });

      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }

      const {
        startDate,
        endDate,
        recurrencePattern,
        timeSlot,
        patientId
      } = recurringData;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const [startHour, startMinute] = timeSlot.start.split(':').map(Number);
      const [endHour, endMinute] = timeSlot.end.split(':').map(Number);
      
      const schedules = [];
      const currentDate = new Date(start);
      
      // Function to set time on a date
      const setTime = (date, hours, minutes) => {
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
      };
      
      // Calculate dates based on recurrence pattern
      // Add a safety mechanism to prevent infinite loops
      const MAX_ITERATIONS = 365; // Maximum number of iterations to prevent infinite loops
      let iteration = 0;
      
      while (currentDate <= end && iteration < MAX_ITERATIONS) {
        iteration++;
        
        const startTime = setTime(currentDate, startHour, startMinute);
        const endTime = setTime(currentDate, endHour, endMinute);
        
        // Create schedule for this date
        const scheduleData = {
          title: `${task.details.substring(0, 30)}${task.details.length > 30 ? '...' : ''}`,
          description: task.details,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          doctorId: task.doctorId,
          nurseId: task.nurseId,
          taskId: task.id,
          isRecurring: true,
          recurrencePattern,
          status: 'SCHEDULED'
        };
        
        // Add patient if provided
        if (patientId) {
          scheduleData.patientId = patientId;
        }
        
        const schedule = await this.createSchedule(scheduleData);
        schedules.push(schedule);
        
        // Advance to next occurrence based on pattern
        const oldDate = new Date(currentDate); // Store the previous date for validation
        
        switch (recurrencePattern) {
          case 'DAILY':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'WEEKLY':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'BIWEEKLY':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'MONTHLY':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            // For custom patterns, default to daily
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Safety check: ensure the date is actually advancing
        if (currentDate <= oldDate) {
          console.warn(`Date not advancing properly for pattern ${recurrencePattern}. Breaking loop.`);
          break;
        }
      }
      
      // Log warning if we hit the max iterations
      if (iteration >= MAX_ITERATIONS) {
        console.warn(`Maximum number of iterations (${MAX_ITERATIONS}) reached when creating recurring schedules. This may indicate an issue with the recurrence pattern or date range.`);
      }
      
      return schedules;
    } catch (error) {
      console.error('Error creating recurring schedules:', error);
      throw error;
    }
  }

  /**
   * Get schedule statistics
   * @param {string} [doctorId] - Optional doctor ID to filter schedules
   * @param {string} [nurseId] - Optional nurse ID to filter schedules
   * @param {Object} [dateRange] - Optional date range for statistics
   * @returns {Promise<Object>} Schedule statistics
   */
  async getScheduleStatistics(doctorId, nurseId, dateRange = {}) {
    try {
      const whereClause = {};
      
      if (doctorId) {
        whereClause.doctorId = doctorId;
      }
      
      if (nurseId) {
        whereClause.nurseId = nurseId;
      }
      
      // Apply date range if provided
      if (dateRange.start && dateRange.end) {
        whereClause.startTime = {
          gte: new Date(dateRange.start),
          lte: new Date(dateRange.end)
        };
      }
      
      const [
        totalSchedules,
        scheduledCount,
        completedCount,
        cancelledCount
      ] = await Promise.all([
        prisma.schedule.count({ where: whereClause }),
        prisma.schedule.count({ where: { ...whereClause, status: 'SCHEDULED' } }),
        prisma.schedule.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        prisma.schedule.count({ where: { ...whereClause, status: 'CANCELLED' } })
      ]);
      
      // Get upcoming schedules
      const now = new Date();
      const upcomingSchedules = await prisma.schedule.count({
        where: {
          ...whereClause,
          status: 'SCHEDULED',
          startTime: {
            gt: now
          }
        }
      });

      // Get schedules by day of week
      const schedulesByDayOfWeek = await prisma.$queryRaw`
        SELECT 
          EXTRACT(DOW FROM "startTime") as day_of_week,
          COUNT(*) as count
        FROM "Schedule"
        WHERE ${whereClause.doctorId ? `"doctorId" = ${whereClause.doctorId}` : '1=1'}
          AND ${whereClause.nurseId ? `"nurseId" = ${whereClause.nurseId}` : '1=1'}
          ${dateRange.start && dateRange.end ? 
            `AND "startTime" BETWEEN ${new Date(dateRange.start)} AND ${new Date(dateRange.end)}` : 
            ''}
        GROUP BY day_of_week
        ORDER BY day_of_week
      `;
      
      return {
        totalSchedules,
        scheduledCount,
        completedCount,
        cancelledCount,
        upcomingSchedules,
        schedulesByDayOfWeek,
        completionRate: totalSchedules > 0 ? (completedCount / totalSchedules) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting schedule statistics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const scheduleService = new ScheduleService();
export default scheduleService;