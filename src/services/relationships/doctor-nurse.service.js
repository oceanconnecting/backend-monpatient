import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient()

export class DoctorNurseService {
  
    static async getNurses(doctorId) {
      return await prisma.doctorNurse.findMany({
        where: {
          doctorId: doctorId
        }
      });
    }
  
    static async assignTaskToNurse(doctorId, nurseId, taskDetails) {
      return await prisma.task.create({
        data: {
          doctorId: doctorId,
          nurseId: nurseId,
          details: taskDetails,
          status: 'pending'
        }
      });
    }
  
    static async getTasksForNurse(nurseId) {
      return await prisma.task.findMany({
        where: {
          nurseId: nurseId
        }
      });
    }
  
    static async getDoctorSchedule(doctorId) {
      return await prisma.schedule.findMany({
        where: {
          doctorId: doctorId
        }
      });
    }
  
    static async sendMessageToNurse(doctorId, nurseId, message) {
      return await prisma.message.create({
        data: {
          fromDoctorId: doctorId,
          toNurseId: nurseId,
          content: message
        }
      });
    }
  }