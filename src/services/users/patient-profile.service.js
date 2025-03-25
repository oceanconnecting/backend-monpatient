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
        preferredPharmacy:true,
        allergies: true,
        insuranceInfo:true,
        emergencyContact: true
      }
    });
    return { ...commonProfile, ...patientDetails };
  }
}