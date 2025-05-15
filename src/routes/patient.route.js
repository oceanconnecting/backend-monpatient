import { checkRole } from "../middleware/auth.middleware.js";
import { PatientService } from "../services/users/patients.service.js";

export async function patientRoutes(fastify) {
  fastify.get("/nurses", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const doctors = await PatientService.getnurseOfpatient(request?.user?.patient?.id);
        reply.code(200).send(doctors);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  fastify.get("/doctors/all", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const doctors = await PatientService.getAllDoctors();
        reply.code(200).send(doctors);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });

  fastify.get("/nurses/all", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const nurses = await PatientService.getAllnurses(request.user.id);
        reply.code(200).send(nurses);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  // 
  fastify.get("/pharmacies", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const pharmacies = await PatientService.getAllpharmacies(
          request.user.id
        );
        reply.code(200).send(pharmacies);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  // This route allows patients to view their appointments
  fastify.get("/emergency-contact", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const emergencyContact = await PatientService.getEmergencyContact(request?.user?.patient.id);
        reply.code(200).send(emergencyContact);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  // This route allows patients to update their emergency contact
  fastify.put("/emergency-contact", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const emergencyContact = await PatientService.updateEmergencyContact(request.user.patient.id, request.body);
        reply.code(200).send(emergencyContact);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  // This route allows patients to send a request for medicine
  fastify.post("/order-medicine", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    handler: async (request, reply) => {
      try {
        const orderMedicine = await PatientService.patientsendOrderMedicine(request.user.patient.id, request.body);
        reply.code(200).send(orderMedicine);
      } catch (error) {
        reply.code(500).send(error);
      }
    },
  });
  // This route allows patients to view their medical records
  fastify.get("/medical-record", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const medicalRecord = await PatientService.getmedicalRecorde(request.user.patient.id);
        if (!medicalRecord) {
          return reply.code(404).send({ message: "Medical record not found" });
        }
        reply.code(200).send(medicalRecord);
      } catch (error) {
        console.error(error);  // Always good to log the error
        reply.code(500).send({ message: "Internal server error" });
      }
    }
  });
  //search for doctors and nurses by name
  // This route allows patients to search for doctors and nurses by name
  fastify.get("/search", {
    onRequest: [fastify.authenticate, checkRole(["PATIENT"])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const { searchName } = request.query; // Changed from 'name' to 'searchName'
  
        // If no searchName is provided, return all 
        if (!searchName) {
          const { allStaff } = await PatientService.getAllDoctorsAndNurses();
          return allStaff;
        }
  
        const DoctorsAndNurses = await PatientService.searchDoctorsAndNursesByName(searchName);
        return DoctorsAndNurses;
      } catch (error) {
        reply.code(500).send({ error: error.message });
      }
    },
  });
  // This route allows patients to view their appointments
  fastify.get('/doctors/:id', async (request, reply) => {
    
    const doctor = await PatientService.getDoctorById(request.params.id);
    
    if (!doctor) {
      return reply.code(404).send({ message: 'Doctor not found' });
    }
    
    return doctor;
  });
  
  // Nurse route
  fastify.get('/nurses/:id', async (request, reply) => {
    const { id } = request.params ;
    
    const nurse = await PatientService.getNurseById(id);
    
    if (!nurse) {
      return reply.code(404).send({ message: 'Nurse not found' });
    }
    
    return nurse;
  });
  //location route
 
}
