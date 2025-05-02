// config/routes.js
// Import all route modules
import { authRoutes } from "../routes/auth.routes.js";
import { adminRoutes } from "../routes/admin.routes.js";
import { doctorPatientRoutes } from "../routes/relationships/doctor-patient.routes.js";
import { nurseServiceRoutes } from "../routes/nurse-service.routes.js";
import { notificationRoutes } from "../routes/notifications/notification.routes.js";
import { chatRoutes } from "../routes/chat/chat.routes.js";
import { chatPatientNurseRoutes } from "../routes/chat/chat-pationt-nurse.routes.js";
import { chatPatientNurseDoctorRoutes } from "../routes/chat/chat-pationt-nurse-doctor.js";
import { patientRoutes } from "../routes/patient.route.js";
import { websocketRoutes } from "../routes/websocket.routes.js";
import { profileRoutes } from "../routes/profile.routes.js";
import { medicalRecordsRoutes } from "../routes/medicalRecords.routes.js";
import { prescriptionRoutes } from "../routes/prescription.routes.js";
import { doctorRoutes } from "../routes/doctor.routes.js";
import locationRoutes from "../routes/location.routes.js";
import { pharmacyMedicinesRoutes } from "../routes/pharmacy/pharmacy.medicine.route.js";
import pharmacyPerscriptionRoutes from "../routes/pharmacy/pharmacy.prescription.route.js";
import pharmacyOrdersRoutes from "../routes/pharmacy/Order.Pharmacy.Route.js";

export async function configureRoutes(fastify) {
  const apiPrefix = "/api";
  
  // Group routes by domain for better organization
  const routeGroups = {
    auth: [
      { routes: authRoutes, prefix: `${apiPrefix}/auth` },
      { routes: adminRoutes, prefix: `${apiPrefix}/admin` },
      { routes: profileRoutes, prefix: `${apiPrefix}/profile` },
    ],
    
    users: [
      { routes: patientRoutes, prefix: `${apiPrefix}/patient` },
      { routes: doctorRoutes, prefix: `${apiPrefix}/doctors` },
      { routes: doctorPatientRoutes, prefix: `${apiPrefix}/doctor-patient` },
    ],
    
    medical: [
      { routes: medicalRecordsRoutes, prefix: `${apiPrefix}/medical-records` },
      { routes: prescriptionRoutes, prefix: `${apiPrefix}/prescription` },
      { routes: nurseServiceRoutes, prefix: `${apiPrefix}/nurse-service` },
      
    ],
    location: [
      { routes: locationRoutes, prefix: `${apiPrefix}/location` },
    ],
    communications: [
      { routes: notificationRoutes, prefix: `${apiPrefix}/notifications` },
      { routes: chatRoutes, prefix: `${apiPrefix}/chat` },
      { routes: chatPatientNurseRoutes, prefix: `${apiPrefix}/chat-patient-nurse` },
      { routes: chatPatientNurseDoctorRoutes, prefix: `${apiPrefix}/chat-patient-nurse-doctor` },
      { routes: websocketRoutes, prefix: `${apiPrefix}/ws` },
    ],
    
    pharmacy: [
      { routes: pharmacyMedicinesRoutes, prefix: `${apiPrefix}/pharmacy/medicines` },
      { routes: pharmacyPerscriptionRoutes, prefix: `${apiPrefix}/pharmacy/prescriptions` },
      { routes: pharmacyOrdersRoutes, prefix: `${apiPrefix}/pharmacy/orders` },
    ],
  };
  
  // Register all routes
  for (const group in routeGroups) {
    for (const { routes, prefix } of routeGroups[group]) {
      await fastify.register(routes, { prefix });
    }
  }
}