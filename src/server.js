import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { authRoutes } from "./routes/auth.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { doctorPatientRoutes } from "./routes/relationships/doctor-patient.routes.js";
import { nurseServiceRoutes } from "./routes/relationships/nurse-service.routes.js";
import { notificationRoutes } from "./routes/notifications/notification.routes.js";
import { chatRoutes } from "./routes/chat/chat.routes.js";
import { chatPatientNurseRoutes } from "./routes/chat/chat-pationt-nurse.routes.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { chatPatientNurseDoctorRoutes } from "./routes/chat/chat-pationt-nurse-doctor.js";
import { createNotificationMiddleware } from "./middleware/notification.middleware.js";
import { patientRoutes } from "./routes/relationships/patient.route.js";
import { websocketRoutes } from './routes/websocket-routes.js';
import dotenv from "dotenv";
dotenv.config();

// Store connected clients and their user info
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

  // Register CORS first
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Register WebSocket plugin
  // await fastify.register(fastifyWebsocket, {
  //   options: {
  //     maxPayload: 1048576, // 1MB max payload
  //     clientTracking: true,
  //   }
  // });

  // JWT plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: "20d",
    },
  });

  // Auth middleware
  fastify.decorate("authenticate", createAuthMiddleware(fastify));
  fastify.addHook("onRequest", createNotificationMiddleware(fastify));

  // Helper to broadcast messages to specific users
  fastify.decorate("broadcastToUser", (userId, event, data) => {
    connectedClients.forEach((client, connection) => {
      if (client.userId === userId) {
        connection.socket.send(JSON.stringify({ event, data }));
      }
    });
  });
fastify.register(websocketRoutes);

  // Register routes
  const apiPrefix = "/api";
  await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await fastify.register(adminRoutes, { prefix: `${apiPrefix}/admin` });
  await fastify.register(patientRoutes, { prefix: `${apiPrefix}/patient` });
  await fastify.register(doctorPatientRoutes, { prefix: `${apiPrefix}/doctor-patient` });
  await fastify.register(nurseServiceRoutes, { prefix: `${apiPrefix}/nurse-service` });
  await fastify.register(notificationRoutes, { prefix: `${apiPrefix}/notifications` });
  await fastify.register(chatRoutes, { prefix: `${apiPrefix}/chat` });
  await fastify.register(chatPatientNurseRoutes, { prefix: `${apiPrefix}/chat-patient-nurse` });
  await fastify.register(chatPatientNurseDoctorRoutes, { prefix: `${apiPrefix}/chat-patient-nurse-doctor` });

  // Health check route
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      connections: connectedClients.size
    };
  });

  return fastify;
}

// Start server
const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({
      port: process.env.PORT
    });
    console.log(`Server running at http://localhost:${process.env.PORT}`);
  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

export default async (req, res) => {
  const fastify = await buildApp();
  await fastify.ready();
  fastify.server.emit("request", req, res);
};

export { buildApp };