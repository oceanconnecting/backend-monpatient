import cloudinary from "../../config/cloudinary.js"
import {PrismaClient} from "@prisma/client"
const prisma = new PrismaClient()
// services/users/base-profile.service.js
export class BaseProfileService {
  constructor(db) {
    this.db = db;
  }

  async getCommonProfile(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        telephoneNumber: true,
        profilePhoto: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async updateCommonProfile(userId, profileData) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: profileData.name,
        phone: profileData.phone,
        // other common fields
      }
    });
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(oldPassword, user.password))) {
      throw new Error('Invalid old password');
    }
    return prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(newPassword) }
    });
  }

  async uploadProfilePicture(userId, file) {
    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'profile-pictures',
        public_id: `user-${userId}`,
        overwrite: true,
        transformation: [
          { width: 200, height: 200, crop: 'thumb', gravity: 'face' }
        ]
      });

      // Return Cloudinary URL
      return prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: result.secure_url }
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload profile picture');
    }
  }

}