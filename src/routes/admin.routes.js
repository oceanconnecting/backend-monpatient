import { userRoutes } from './admin/users.routes.js';
import { doctorRoutes } from './admin/doctors.routes.js';
import { nurseRoutes } from './admin/nurses.routes.js';
import { patientRoutes } from './admin/patients.routes.js';
import { chatRoutes } from './admin/chat.routes.js';

export async function adminRoutes(fastify) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(doctorRoutes, { prefix: '/doctors' });
  fastify.register(nurseRoutes, { prefix: '/nurses' });
  fastify.register(patientRoutes, { prefix: '/patients' });
  fastify.register(chatRoutes, { prefix: '/chat' });
}