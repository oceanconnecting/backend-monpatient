// routes/profile.routes.js
import { DoctorProfileService } from '../services/users/doctor-profile.service.js';
import { NurseProfileService } from '../services/users/nurse-profile.service.js';
import { PatientProfileService } from '../services/users/patient-profile.service.js';
import { PharmacyProfileService } from '../services/users/pharmacy-profile.service.js';
import { BaseProfileService } from '../services/users/base-profile.service.js';
import { checkRole } from '../middleware/auth.middleware.js';

export async function profileRoutes(fastify, options) {
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
    preHandler: fastify.authenticate,
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            telephoneNumber: { type: 'string' },
            profilePhoto: { type: 'string' },
            role: { type: 'string' },
            allergies: { type: 'string' },
            emergencyContactName: { type: 'string' },
            emergencyContactRelationship: { type: 'string' },
            insuranceInfo: { type: 'string' },
            preferredPharmacy: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            // Add other common profile fields
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
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: 'object',
        properties: {
          firstname: { type: 'string', minLength: 2 },
          lastname: { type: 'string', minLength: 2 },
          telephoneNumber: { type: 'string' },
          // Add other updatable fields
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const profileService = getProfileService(request.user.role, fastify.db);
        const updatedProfile = await profileService.updateProfile(
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
    preHandler: fastify.authenticate,
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

  // Profile picture upload
  fastify.post('/upload', {
    onRequest: [fastify.authenticate],
    preHandler: [
      fastify.upload.single('profilePhoto')
    ],
    schema: {
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            avatarUrl: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      if (!request.file) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }
  
      try {
        const profileService = new BaseProfileService(fastify.db);
        const result = await profileService.uploadProfilePicture(
          request.user.id,
          request.file
        );
        
        return { 
          message: 'Profile picture uploaded successfully',
          profilePhoto: result.profilePhoto 
        };
      } catch (error) {
        reply.code(error.statusCode || 500).send({ 
          error: error.message || 'Failed to upload profile picture' 
        });
      }
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
}