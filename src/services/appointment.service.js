import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AppointmentService {
  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData) {
    try {
      const appointment = await prisma.appointment.create({
        data: appointmentData,
      });
      return appointment;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw new Error("Failed to create appointment");
    }
  }

  /**
   * Get all appointments with optional filtering
   */
  async getAllAppointments(filters) {
    try {
      const where = {};
      
      if (filters?.date) {
        const startDate = new Date(filters.date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(filters.date);
        endDate.setHours(23, 59, 59, 999);
        
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }
      
      if (filters?.appointmentType) {
        where.appointmentType = filters.appointmentType;
      }
      
      if (filters?.isVirtual !== undefined) {
        where.isVirtual = filters.isVirtual;
      }
      
      if (filters?.reminderSent !== undefined) {
        where.reminderSent = filters.reminderSent;
      }
      
      if (filters?.isCancelled !== undefined) {
        where.cancelledAt = filters.isCancelled ? { not: null } : null;
      }
      
      const appointments = await prisma.appointment.findMany({
        where,
        include: {
          medicalRecord: true,
        },
      });
      
      return appointments;
    } catch (error) {
      console.error("Error fetching appointments:", error);
      throw new Error("Failed to retrieve appointments");
    }
  }

  /**
   * Get a single appointment by ID
   */
  async getAppointmentById(id) {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          medicalRecord: true,
        },
      });
      
      if (!appointment) {
        throw new Error("Appointment not found");
      }
      
      return appointment;
    } catch (error) {
      console.error(`Error fetching appointment with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(id, updateData) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
      });
      
      return appointment;
    } catch (error) {
      console.error(`Error updating appointment with ID ${id}:`, error);
      throw new Error("Failed to update appointment");
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id, cancelReason) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          cancelReason,
          cancelledAt: new Date(),
        },
      });
      
      return appointment;
    } catch (error) {
      console.error(`Error cancelling appointment with ID ${id}:`, error);
      throw new Error("Failed to cancel appointment");
    }
  }
  // doctorGetAppointment
 async doctorGetAppointment(doctorId) {
  try {
    const appointment = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
      },
      include: {
        
        patient: {
          include: {
            user: {
              select:{
                firstname: true,
                lastname: true,
                email: true,
              }
            },
          },
        },
        medicalRecord:true
      }
    });
    return appointment;
  } catch (error) {
    console.error(`Error getting doctor appointment with ID ${doctorId}:`, error);
    throw new Error("Failed to get doctor appointment");
  }
 }
  /**
   * Delete an appointment permanently
   */
  async deleteAppointment(id,doctorId) {
    try {
      await prisma.appointment.delete({
        where: { id,doctorId },
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting appointment with ID ${id}:`, error);
      throw new Error("Failed to delete appointment");
    }
  }

  /**
   * Mark a reminder as sent for an appointment
   */
  async markReminderSent(id) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          reminderSent: true,
        },
      });
      
      return appointment;
    } catch (error) {
      console.error(`Error marking reminder sent for appointment with ID ${id}:`, error);
      throw new Error("Failed to update reminder status");
    }
  }
 async cencelAppointment(id, cancelReason,doctorId) {
    try {
      const appointment = await prisma.appointment.update({
        where: { id,doctorId },
        data: {
          cancelReason,
          cancelledAt: new Date(),
        },
      });
      
      return appointment;
    } catch (error) {
      console.error(`Error cancelling appointment with ID ${id}:`, error);
      throw new Error("Failed to cancel appointment");
    }
  }
  /**
   * Get upcoming appointments that need reminders
   */
  async getUpcomingAppointmentsNeedingReminders(hoursAhead = 24) {
    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      
      const appointments = await prisma.appointment.findMany({
        where: {
          date: {
            gte: now,
            lte: futureDate,
          },
          reminderSent: false,
          cancelledAt: null,
        },
      });
      
      return appointments;
    } catch (error) {
      console.error("Error fetching appointments needing reminders:", error);
      throw new Error("Failed to retrieve appointments needing reminders");
    }
  }
}