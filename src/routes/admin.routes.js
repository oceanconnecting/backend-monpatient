import { userRoutes } from './admin/users.routes.js';

import { pharmacyRoutes } from './pharmacy.routes.js';

export async function adminRoutes(fastify) {
  fastify.register(userRoutes, { prefix: '/users' });
  fastify.register(pharmacyRoutes, { prefix: '/pharmacy' });
}