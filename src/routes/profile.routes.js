// routes/profile.routes.js
import { DoctorProfileService } from '../services/users/doctor-profile.service.js';
import { NurseProfileService } from '../services/users/nurse-profile.service.js';
import { PatientProfileService } from '../services/users/patient-profile.service.js';
import { PharmacyProfileService } from '../services/users/pharmacy-profile.service.js';
import { BaseProfileService } from '../services/users/base-profile.service.js';

export async function profileRoutes(fastify, options) {
  // Route for common profile operations
  fastify.get('/', {
    preHandler: fastify.authenticate,
    handler: async (request) => {
      let profileService;
      switch(request.user.role) {
        case 'DOCTOR':
          profileService = new DoctorProfileService(fastify.db);
          break;
        case 'NURSE':
          profileService = new NurseProfileService(fastify.db);
          break;
        case 'PATIENT':
          profileService = new PatientProfileService(fastify.db);
          break;
        case 'PHARMACY':
          profileService = new PharmacyProfileService(fastify.db);
          break;
        default:
          throw new Error('Unknown role');
      }
      return profileService.getProfile(request.user.id);
    }
  });

  // Common update route
  fastify.put('/', {
    preHandler: fastify.authenticate,
    handler: async (request) => {
      let profileService;
      switch(request.user.role) {
        case 'DOCTOR':
          profileService = new DoctorProfileService(fastify.db);
          break;
        case 'NURSE':
          profileService = new NurseProfileService(fastify.db);
          break;
        case 'PATIENT':
          profileService = new PatientProfileService(fastify.db);
          break;
        case 'PHARMACY':
          profileService = new PharmacyProfileService(fastify.db);
          break;
        default:
          throw new Error('Unknown role');
      }
      return profileService.updateProfile(request.user.id, request.body);
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
          oldPassword: { type: 'string', minLength: 6 },
          newPassword: { type: 'string', minLength: 6 }
        }
      }
    },
    handler: async (request) => {
      const profileService = new BaseProfileService(fastify.db);
      await profileService.changePassword(
        request.user.id,
        request.body.oldPassword,
        request.body.newPassword
      );
      return { message: 'Password changed successfully' };
    }
  });

  // Profile picture upload
  fastify.post('/upload', {
    preHandler: [
      fastify.authenticate,
      fastify.upload.single('profilePhoto')
    ],
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
          avatarUrl: result.avatar 
        };
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    }
  });
}