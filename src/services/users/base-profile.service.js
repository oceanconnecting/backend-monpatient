import cloudinary from "../../config/cloudinary.js";
import { PrismaClient } from "@prisma/client";
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient();

export class BaseProfileService {
  constructor(db) {
    this.db = db;
  }

  // Helper function to verify password
  async hashPassword(password) {
    return bcryptjs.hash(password, 10)
  }
  async verifyPassword(password, hash) {
    return bcryptjs.compare(password, hash)
  }

  async getCommonProfile(userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        address : true,
        long:true ,     
        lat:true,       
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
        firstname: profileData.firstname,
        lastname: profileData.lastname,
        telephoneNumber: profileData.telephoneNumber,
        dateOfBirth: profileData.dateOfBirth,
        gender:profileData.gender,
        lat: profileData.lat,
        long: profileData.long,
        address: profileData.address,
        // other common fields
      }
    });
  }

  async changePassword(userId, oldPassword, newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await this.verifyPassword(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid old password');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
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
  async deleteProfilePicture(userId) {
    try {
      // Delete from Cloudinary
      await cloudinary.uploader.destroy(`user-${userId}`, { resource_type: 'image' });

      // Remove profile picture URL from database
      return prisma.user.update({
        where: { id: userId },
        data: { profilePhoto: null }
      });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete profile picture');
    }
  }


}