import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { Server } from "socket.io";
import { createServer } from "http";
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
import dotenv from "dotenv";
dotenv.config();
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

const prisma = new PrismaClient();

// Create HTTP server
const httpServer = createServer(fastify.server);

// Create Socket.IO instance
const io = new Server(fastify.server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make fastify instance available to Socket.IO
io.fastify = fastify;

// Make io available to routes
fastify.decorate("io", io);

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET,
  sign: {
    expiresIn: "20d",
  },
});

// Register authentication middleware
fastify.decorate("authenticate", createAuthMiddleware(fastify));

// Register notification middleware
fastify.addHook("onRequest", createNotificationMiddleware(fastify));

// Register routes with API versioning prefix
const apiPrefix = "/api";
await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
await fastify.register(adminRoutes, { prefix: `${apiPrefix}/admin` });
await fastify.register(patientRoutes, { prefix: `${apiPrefix}/patient` });
await fastify.register(doctorPatientRoutes, {
  prefix: `${apiPrefix}/doctor-patient`,
});
await fastify.register(nurseServiceRoutes, {
  prefix: `${apiPrefix}/nurse-service`,
});
await fastify.register(notificationRoutes, {
  prefix: `${apiPrefix}/notifications`,
});
await fastify.register(chatRoutes, { prefix: `${apiPrefix}/chat` });
await fastify.register(chatPatientNurseRoutes, {
  prefix: `${apiPrefix}/chat-patient-nurse`,
});
await fastify.register(chatPatientNurseDoctorRoutes, {
  prefix: `${apiPrefix}/chat-patient-nurse-doctor`,
});

//check route
fastify.get(
  "/",
  {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string" },
          },
        },
      },
    },
  },
  async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
);

// Error handler
fastify.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: "Validation Error",
      message: error.message,
      details: error.validation,
    });
  }

  // Handle JWT errors
  if (error.statusCode === 401) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: error.message,
    });
  }

  // Handle Prisma errors
  if (error.code?.startsWith("P")) {
    return reply.status(400).send({
      error: "Database Error",
      message: error.message,
    });
  }

  reply.status(error.statusCode || 500).send({
    error: error.name || "Internal Server Error",
    message: error.message,
  });
});

// Close Prisma when the server shuts down
fastify.addHook("onClose", async () => {
  await prisma.$disconnect();
});

// For local development

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT || 3000,
      host: "0.0.0.0",
    });
    console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
    console.log(`WebSocket connections available on same port`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();

// Export for Vercel
export default async (req, res) => {
  await fastify.ready();
  fastify.server.emit("request", req, res);
};
