import { userRoutes } from './admin/users.routes.js';
import { chatRoutes } from './admin/chat.routes.js';
import { pharmacyRoutes } from './pharmacy/pharmacy.routes.js';

export async function adminRoutes(fastify) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(chatRoutes, { prefix: '/chat' });
  fastify.register(pharmacyRoutes, { prefix: '/pharmacy' });
}