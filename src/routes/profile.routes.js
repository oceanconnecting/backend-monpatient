// routes/profile.routes.js
import { DoctorProfileService } from '../services/users/doctor-profile.service.js';
import { NurseProfileService } from '../services/users/nurse-profile.service.js';
import { PatientProfileService } from '../services/users/patient-profile.service.js';
import { PharmacyProfileService } from '../services/users/pharmacy-profile.service.js';
import { BaseProfileService } from '../services/users/base-profile.service.js';
import { checkRole } from '../middleware/auth.middleware.js';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid'; 
export async function profileRoutes(fastify) {
  // Decorate fastify with profile services
  fastify.decorate('profileServices', {
    DOCTOR: (db) => new DoctorProfileService(db),
    NURSE: (db) => new NurseProfileService(db),
    PATIENT: (db) => new PatientProfileService(db),
    PHARMACY: (db) => new PharmacyProfileService(db),
  });

  // Helper function to get appropriate profile service
  const getProfileService = (role, db) => {
    const serviceFactory = fastify.profileServices[role];
    if (!serviceFactory) {
      throw new Error(`Unsupported role: ${role}`);
    }
    return serviceFactory(db);
  };
  // Route for common profile operations
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            // Common fields (from BaseProfileService)
            id: { type: 'string' },
            email: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            telephoneNumber: { type: 'string' },
            profilePhoto: { type: 'string' },
            role: { type: 'string' },
            allergies: { type: 'string', nullable: true },
            emergencyContactName: { type: 'string', nullable: true },
            emergencyContactRelationship: { type: 'string', nullable: true },
            insuranceInfo: { 
              type: 'object', 
              nullable: true,
              properties: {
                id: { type: 'string' },
                type: { type: 'string', nullable: true },
                insuranceCode: { type: 'string', nullable: true },
                dateStart: { type: 'string', nullable: true },
                dateEnd: { type: 'string', nullable: true },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            },
         
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
  
            // Role-specific fields (conditionally included based on role)
            // Nurse fields
            professionalLicenseNumber: { type: 'string', nullable: true },
            nursingCertification: { type: 'string', nullable: true },
            yearsOfExperience: { type: 'number', nullable: true },
            hospitalAffiliation: { type: 'string', nullable: true },
            availability: { type: 'string', nullable: true },
            rating: { type: 'number', nullable: true },
            // Doctor fields
            specialization: { type: 'string', nullable: true },
            licenseNumber: { type: 'string', nullable: true },
            
            // Patient fields
            bloodType: { type: 'string', nullable: true },
            height: { type: 'string', nullable: true },
            weight: { type: 'string', nullable: true },
            
            // Pharmacy fields
            pharmacyLicense: { type: 'string', nullable: true },
            operatingHours: { type: 'string', nullable: true },
            lat: { type: 'number', nullable: true },
            long: { type: 'number', nullable: true },
            address: { type: 'string', nullable: true },
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const profileService = getProfileService(request.user.role, fastify.db);
        return await profileService.getProfile(request.user.id);
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Common update route
fastify.put('/', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          firstname: { type: 'string', minLength: 2 },
          lastname: { type: 'string', minLength: 2 },
          telephoneNumber: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date-time' },
          lat: { type: 'number' },
          long: { type: 'number' },
          address: { type: 'string' },
          gender: { type: 'string' },
          // Add other updatable fields
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            telephoneNumber: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date-time' },
            lat: { type: 'number' },
            long: { type: 'number' },
            address: { type: 'string' },
            gender: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const profileService = getProfileService(request.user.role, fastify.db);
        const updatedProfile = await profileService.updateCommonProfile(
          request.user.id, 
          request.body
        );
        return updatedProfile;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Common password change
  fastify.post('/change-password', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const profileService = new BaseProfileService(fastify.db);
        await profileService.changePassword(
          request.user.id,
          request.body.oldPassword,
          request.body.newPassword
        );
        return { message: 'Password changed successfully' };
      } catch (error) {
        reply.code(error.statusCode || 400).send({ error: error.message });
      }
    }
  });
// Add insurance info update route for patients
  fastify.put('/insurance', {
  onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
  schema: {
    body: {
      type: 'object',
      required: ['type', 'insuranceCode', 'dateStart'],
      properties: {
        type: { type: 'string' },
        insuranceCode: { type: 'string' },
        dateStart: { type: 'string', format: 'date-time' },
        dateEnd: { type: 'string', format: 'date-time', nullable: true }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          insuranceCode: { type: 'string' },
          dateStart: { type: 'string' },
          dateEnd: { type: 'string', nullable: true },
          createdAt: { type: 'string' },
          updatedAt: { type: 'string' }
        }
      }
    }
  },
  handler: async (request, reply) => {
    try {
      // Ensure the user is a patient
      if (request.user.role !== 'PATIENT') {
        return reply.code(403).send({ error: 'Only patients can update insurance information' });
      }

      const patientProfileService = new PatientProfileService(fastify.db);
      const updatedInsurance = await patientProfileService.updateInsuranceInfo(
        request.user.id,
        request.body
      );
      
      return updatedInsurance;
    } catch (error) {
      request.log.error(error);
      reply.code(error.statusCode || 500).send({ error: error.message });
    }
  }
  });
  // Profile picture upload
  fastify.post('/upload', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }
      
      // Create temp directory if it doesn't exist
      const tempDir = '/tmp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create a temporary file path
      const tempFilePath = path.join(tempDir, `${uuidv4()}${path.extname(data.filename)}`);
      
      // Save the file to disk (needed for Cloudinary)
      await pipeline(data.file, fs.createWriteStream(tempFilePath));
      
      // Create a file object similar to what multer would provide
      const fileObj = {
        path: tempFilePath,
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.file.bytesRead
      };
      
      // Upload to Cloudinary using your existing service
      const profileService = new BaseProfileService(fastify.db);
      const result = await profileService.uploadProfilePicture(
        request.user.id,
        fileObj
      );
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      return {
        status: 'success',
        message: 'File uploaded successfully',
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(error.statusCode || 500).send({
        error: error.message || 'Failed to upload profile picture'
      });
    }
  });

  // Add role-specific routes if needed
  fastify.register(async function (fastify) {
    // Doctor-specific routes
    fastify.get('/doctor/special', {
      preHandler: [fastify.authenticate, checkRole(['DOCTOR'])],
      handler: async (request) => {
        const profileService = new DoctorProfileService(fastify.db);
        return profileService.getSpecialDoctorData(request.user.id);
      }
    });

    // Similarly for other roles...
  }, { prefix: '/role-specific' });
  // Location upload route
 
}