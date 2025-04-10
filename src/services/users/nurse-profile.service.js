// services/users/nurse-profile.service.js
import { BaseProfileService } from './base-profile.service.js';
import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
export class NurseProfileService extends BaseProfileService {
  async getProfile(userId) {
    const commonProfile = await super.getCommonProfile(userId);
    const nurseDetails = await prisma.nurse.findUnique({
      where: { userId },
      select: {
        professionalLicenseNumber: true,
       nursingCertification: true,
       yearsOfExperience: true,
       rating:true,
       hospitalAffiliation:true,
       availability:true
      }
    });
    return { ...commonProfile, ...nurseDetails };
  }
}