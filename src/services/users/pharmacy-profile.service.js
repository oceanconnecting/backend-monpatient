// services/users/pharmacy-profile.service.js
import { BaseProfileService } from './base-profile.service.js';
import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
export class PharmacyProfileService extends BaseProfileService {
  async getProfile(userId) {
    const commonProfile = await super.getCommonProfile(userId);
    const pharmacyDetails = await prisma.pharmacy.findUnique({
      where: { userId },
      select: {
        pharmacyName: true,
        pharmacyAddress: true,
        contactName: true,
        openingHours: true,
        deliveryOptions: true,
        openingHours: true,
        pharmacyLicenseNumber: true
      }
    });
    return { ...commonProfile, ...pharmacyDetails };
  }

  async updateProfile(userId, profileData) {
    const updatedProfile = await prisma.pharmacy.update({
      where: { userId },
      data: profileData
    });
    return updatedProfile;
  }
}