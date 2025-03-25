// services/users/doctor-profile.service.js
import { BaseProfileService } from './base-profile.service.js';
import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
export class DoctorProfileService extends BaseProfileService {
  async getProfile(userId) {
    const commonProfile = await super.getCommonProfile(userId);
    const doctorDetails = await prisma.doctor.findUnique({
      where: { userId },
      select: {
        specialization: true,
        professionalLicenseNumber: true,
        hospitalAffiliation: true
      }
    });
    return { ...commonProfile, ...doctorDetails };
  }

  async updateProfile(userId, profileData) {
    await super.updateCommonProfile(userId, profileData);
    return prisma.doctor.update({
      where: { userId },
      data: {
        specialization: profileData.specialization,
        professionalLicenseNumber: profileData.professionalLicenseNumber,
        hospitalAffiliation: profileData.hospitalAffiliation,
        consultationFee: profileData.consultationFee
      }
    });
  }
}