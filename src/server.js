import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { Server } from "socket.io";
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
// import { socketIOPlugin } from "./plugins/socket-io.js";
import dotenv from "dotenv";
dotenv.config();

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

  // Initialize Socket.IO with CORS configuration
  const io = new Server(fastify.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Decorate fastify with io instance
  fastify.decorate("io", io);

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

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("authenticate", (token) => {
      try {
        const decoded = fastify.jwt.verify(token);
        socket.user = decoded;
        console.log(`User ${decoded.id} authenticated`);
      } catch (err) {
        console.error("Authentication failed:", err.message);
        socket.disconnect(true);
      }
    });

    socket.on("chat message", (data) => {
      if (!socket.user) {
        console.error("Unauthorized chat attempt");
        return;
      }
      io.to(data.recipientId).emit("chat message", {
        senderId: socket.user.id,
        message: data.message,
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
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
      connections: io.sockets.sockets.size
    };
  });

  return fastify;
}

// Start server
const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({
      port: process.env.PORT || 3001,
      host: "0.0.0.0",
    });
    console.log(`Server running at http://localhost:${process.env.PORT || 3001}`);
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