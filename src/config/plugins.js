// config/plugins.js
import fastifyCors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";
import googleOAuth2 from "../plugin/google-oauth.js";

export async function configurePlugins(fastify) {
  // Register CORS with environment-specific configuration
  await fastify.register(fastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // File upload handling
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit 
    },
  });

  // JWT authentication
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    decode: { complete: true },
    sign: {
      expiresIn: process.env.JWT_EXPIRATION || "20d",
    },
  });

  // WebSocket support
  await fastify.register(websocket);

  // Rate limiting
  await fastify.register(fastifyRateLimit, {
    max: process.env.RATE_LIMIT_MAX || 100,
    timeWindow: process.env.RATE_LIMIT_WINDOW || "1 minute",
  });

  // Security headers
  await fastify.register(fastifyHelmet);

  // OAuth integration
  await fastify.register(googleOAuth2);
}