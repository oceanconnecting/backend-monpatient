// config/middleware.js
import { createAuthMiddleware } from "../middleware/auth.middleware.js";
import { createNotificationMiddleware } from "../middleware/notification.middleware.js";

export async function configureMiddleware(fastify) {
  // Authenticate decorator for protected routes
  fastify.decorate("authenticate", createAuthMiddleware(fastify));
  
  // Add notification middleware to all requests
  fastify.addHook("onRequest", createNotificationMiddleware(fastify));
}