// services/users/patient-profile.service.js
import { BaseProfileService } from './base-profile.service.js';
import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
export class PatientProfileService extends BaseProfileService {
  async getProfile(userId) {
    const commonProfile = await super.getCommonProfile(userId);
    const patientDetails = await prisma.patient.findUnique({
      where: { userId },
      select: {
        emergencyContactPhone: true,
        allergies: true,
        insuranceInfo:{
          select:{
            type:true,
            insuranceCode:true,
            dateStart:true,  // fixed capitalization from datestart
            dateEnd:true
          }
        },
        emergencyContactName:true,
        emergencyContactRelationship:true
      }
    });
    return { ...commonProfile, ...patientDetails };
  }
  async updateInsuranceInfo(userId, insuranceData) {
    try {
      // First, get the patient to find the associated insuranceInfoId
      const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true}
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      let result;

      // If patient has existing insurance info, update it
      if (patient.insuranceInfoId) {
        result = await prisma.insuranceInfo.update({
          where: { id: patient.insuranceInfoId },
          data: {
            type: insuranceData.type,
            insuranceCode: insuranceData.insuranceCode,
            dateStart: insuranceData.dateStart,
            dateEnd: insuranceData.dateEnd
          }
        });
      } else {
        // If no existing insurance info, create new and link to patient
        result = await prisma.insuranceInfo.create({
          data: {
            type: insuranceData.type,
            insuranceCode: insuranceData.insuranceCode,
            dateStart: insuranceData.dateStart,
            dateEnd: insuranceData.dateEnd,
            patient: {
              connect: { id: patient.id }
            }
          }
        });

        // Update patient with the new insurance info id
        await prisma.patient.update({
          where: { id: patient.id },
          data: { insuranceInfoId: result.id }
        });
      }

      return result;
    } catch (error) {
      console.error("Error updating insurance info:", error);
      throw error;
    }
  }
}