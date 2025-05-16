// config/plugins.js
import fastifyCors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";
import googleOAuth2 from "../plugin/google-oauth.js";
import fastifyCookie from "@fastify/cookie";
export async function configurePlugins(fastify) {
  // Register CORS with environment-specific configuration
await fastify.register(fastifyCors, {
  origin: ["http://localhost:5173"], // Replace with your actual frontend domains
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"], // Added Cookie header
  credentials: true,
  exposedHeaders: ["Authorization", "Set-Cookie"], // Added Set-Cookie header
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
await fastify.register(fastifyCookie, {
  secret: "dstcygvhubjkn243567", // Use a secure secret for signing cookies
  parseOptions: {}, // options for parsing cookies
});
  // Rate limiting
  await fastify.register(fastifyRateLimit, {
    global: true,
      max: 100,
  timeWindow: '1 minute'
  });

  // Security headers
  await fastify.register(fastifyHelmet,{ global: true });

  // OAuth integration
  await fastify.register(googleOAuth2);
}