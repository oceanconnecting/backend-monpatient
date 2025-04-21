// server.js
import Fastify from "fastify";
import dotenv from "dotenv";

// Load environment variables early
dotenv.config();

// Import configuration modules
import { configurePlugins } from "./config/plugins.js";
import { configureMiddleware } from "./config/middleware.js";
import { configureRoutes } from "./config/routes.js";
import { configureErrorHandlers } from "./config/errorHandlers.js";
import { configureWebsockets } from "./config/websockets.js";
import { configureSecurityFeatures } from "./config/security.js";
import { configurePerformanceOptimizations } from "./config/performance.js";
// Store connected clients and their user info - consider moving to dedicated module
const connectedClients = new Map();

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === "development" ? "debug" : "info",
    },
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: "all",
        useDefaults: true,
        coerceTypes: true,
        allErrors: true,
      },
    },
  });
  
  // Performance optimizations
  await configurePerformanceOptimizations(fastify);

  // Apply configurations in specific order
  await configureSecurityFeatures(fastify);
  await configurePlugins(fastify);
  await configureMiddleware(fastify);
  await configureWebsockets(fastify, connectedClients);
  await configureRoutes(fastify);
  await configureErrorHandlers(fastify);

  // Health check route
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      connections: connectedClients.size,
    };
  });

  return fastify;
}

// Start server
const start = async () => {
  try {
    const fastify = await buildApp();
    const port = process.env.PORT || 3000;
    await fastify.listen({
      port: port,
      host: "0.0.0.0", // For cloud deployment compatibility
    });
    fastify.log.info(`Server running at http://0.0.0.0:${port}`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
};

// Only start server if not imported (for testing)
if (process.env.NODE_ENV !== "test") {
  start();
}

// For serverless environments
export default async (req, res) => {
  const fastify = await buildApp();
  await fastify.ready();
  fastify.server.emit("request", req, res);
};

export { buildApp };