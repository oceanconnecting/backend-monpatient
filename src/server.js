import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { authRoutes } from "./routes/auth.routes.js";
import { adminRoutes } from "./routes/admin.routes.js";
import { doctorPatientRoutes } from "./routes/relationships/doctor-patient.routes.js";
import { nurseServiceRoutes } from "./routes/nurse-service.routes.js";
import { notificationRoutes } from "./routes/notifications/notification.routes.js";
import { chatRoutes } from "./routes/chat/chat.routes.js";
import { chatPatientNurseRoutes } from "./routes/chat/chat-pationt-nurse.routes.js";
import { createAuthMiddleware } from "./middleware/auth.middleware.js";
import { chatPatientNurseDoctorRoutes } from "./routes/chat/chat-pationt-nurse-doctor.js";
import { createNotificationMiddleware } from "./middleware/notification.middleware.js";
import { patientRoutes } from "./routes/patient.route.js";
import { websocketRoutes } from "./routes/websocket-routes.js";
import googleOAuth2 from "./plugin/google-oauth.js";
import { profileRoutes } from "./routes/profile.routes.js";
import { medicalRecordsRoutes } from "./routes/medicalRecords.routes.js";
import { prescriptionRoutes } from "./routes/prescription.routes.js";
import { doctorRoutes } from "./routes/doctor.routes.js";
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';
import dotenv from "dotenv";
// Add this near other plugin registrations
import multipart from "@fastify/multipart";
import { pharmacyMedicinesRoutes } from "./routes/pharmacy.medicine.route.js";
import pharmacyPerscriptionRoutes from "./routes/pharmacy.prescription.route.js";


import pharmacyOrdersRoutes from "./routes/Order.Pharmacy.Route.js";
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
        allErrors: true
      },
    },
    
  });

  // Register CORS first
  await fastify.register(fastifyCors, {
    origin: true, // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["Authorization"],
    preflightContinue: false,

    optionsSuccessStatus: 204,
  });
  // In your buildApp() function, modify the onRequest hook:
  fastify.addHook("onRequest", (request, reply, done) => {
    reply.header(
      "Content-Security-Policy",
      "connect-src 'self' http://localhost:3000 https://localhost:3000 ws://localhost:3000 wss://localhost:3000;"
    );
    done();
  });
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit (adjust as needed)
    },
  });
  // JWT plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign: {
      expiresIn: "20d",
    },
  });
  await fastify.register(websocket);
  // Auth middleware
  fastify.setErrorHandler((error, request, reply) => {
    // Log the error
    request.log.error(error);
    // Send appropriate response based on error type
    reply.status(error.statusCode || 500).send({
      error: error.name,
      message: error.message,
    });
  });
  fastify.decorate("authenticate", createAuthMiddleware(fastify));
  fastify.addHook("onRequest", createNotificationMiddleware(fastify));
  await fastify.register(googleOAuth2);
  // Helper to broadcast messages to specific users
  fastify.decorate("broadcastToUser", (userId, event, data) => {
    connectedClients.forEach((client, connection) => {
      if (client.userId === userId) {
        connection.socket.send(JSON.stringify({ event, data }));
      }
    });
  });
  // In your Fastify setup

  fastify.get("/ws", { websocket: true }, (connection, req) => {
    // Listen for messages from the client
    connection.on("message", (data) => {
      try {
        // Broadcast the message to all connected clients
        fastify.websocketServer.clients.forEach((client) => {
          if (client.readyState === 1) {
            // 1 means OPEN
            client.send(data);
          }
        });
      } catch (error) {
        console.error(error);
      }
    });
  });
  fastify.register(websocketRoutes);

  console.log("WebSocket routes registered");
  // Register routes
  const apiPrefix = "/api";
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });
  const signals = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      await fastify.close();
      process.exit(0);
    });
  });
  await fastify.register(authRoutes, { prefix: `${apiPrefix}/auth` });
  await fastify.register(adminRoutes, { prefix: `${apiPrefix}/admin` });
  await fastify.register(patientRoutes, { prefix: `${apiPrefix}/patient` });
  await fastify.register(medicalRecordsRoutes, {
    prefix: `${apiPrefix}/medical-records`,
  });


  await fastify.register(pharmacyMedicinesRoutes,{prefix: `${apiPrefix}`});
  await fastify.register(pharmacyPerscriptionRoutes,{prefix:`${apiPrefix}`});
  await fastify.register(pharmacyOrdersRoutes,{prefix:`${apiPrefix}/pharmacy/orders`});


  await fastify.register(doctorPatientRoutes, {
    prefix: `${apiPrefix}/doctor-patient`,
  });
  await fastify.register(profileRoutes, { prefix: `${apiPrefix}/profile` });
  await fastify.register(nurseServiceRoutes, {
    prefix: `${apiPrefix}/nurse-service`,
  });
  await fastify.register(notificationRoutes, {
    prefix: `${apiPrefix}/notifications`,
  });
  await fastify.register(fastifyHelmet);
  await fastify.register(chatRoutes, { prefix: `${apiPrefix}/chat` });
  await fastify.register(chatPatientNurseRoutes, {
    prefix: `${apiPrefix}/chat-patient-nurse`,
  });
  await fastify.register(prescriptionRoutes, {
    prefix: `${apiPrefix}/prescription`,
  });
  await fastify.register(chatPatientNurseDoctorRoutes, {
    prefix: `${apiPrefix}/chat-patient-nurse-doctor`,
  });
  await fastify.register(doctorRoutes, { prefix: `${apiPrefix}/doctors` });

  // Health check route
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      connections: connectedClients.size,
    };
  });

  return fastify;
}

// Start server
const start = async () => {
  try {
    const fastify = await buildApp();
    await fastify.listen({
      port: 3000,
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
