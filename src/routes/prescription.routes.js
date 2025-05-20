
import { checkRole } from "../middleware/auth.middleware.js";
import { PrescriptionService } from "../services/prescription.service.js";
export async function prescriptionRoutes(fastify) {
  // Get all prescriptions
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY'])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const prescriptions = await PrescriptionService.getAllPrescriptions();
        return prescriptions;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Get prescription by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY'])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.getPrescriptionById(request.params.id);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });
 fastify.get("/doctor",{
  onRequest:[fastify.authenticate,checkRole(['DOCTOR'])],
  config:{
    cache:{
      expiresIn:3000
    }
  },
  handler:async(request,reply)=>{
    try{
  const prescription= await PrescriptionService.doctorgethisprescription(request.user.doctor.id)
  return prescription
    }catch(error){
      reply.code(error.statusCode || 500).send({error:error.message})
    }
  }
 })
  // Create new prescription
fastify.post('/', {
  onRequest: [fastify.authenticate, checkRole("DOCTOR")],
  schema: {
    body: {
      type: 'object',
      required: ['patientId', 'details', 'items'],
      properties: {
        patientId: { type: 'string' },
        details: { type: 'string' },
        approved: { type: 'boolean' },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['name', 'quantity'],
            properties: {
              name: { type: 'string' },
              quantity: { type: 'integer', minimum: 1 },
            }
          }
        }
      }
    }
  },
  handler: async (request, reply) => {
    try {
      // Get the prescription created by service
      const prescription = await PrescriptionService.createPrescription(
        request?.user?.doctor?.id, 
        request.body,
        fastify
      );
      
      // Send WebSocket notification to both patient and doctor
      if (fastify.websocket && fastify.websocket.sendToUser) {
        // Send to patient
        if (prescription.prescription.patient?.user?.id) {
          const patientUserId = prescription.prescription.patient.user.id;
          const patientSuccess = fastify.websocket.sendToUser(patientUserId, {
            type: 'PRESCRIPTION_CREATED',
            data: {
              prescriptionId: prescription.prescription.id,
              doctorName: `${prescription.prescription.doctor.user.firstname} ${prescription.prescription.doctor.user.lastname}`,
              details: prescription.prescription.details,
              items: prescription.prescription.items,
              timestamp: new Date().toISOString()
            },
            message: `Dr. ${prescription.prescription.doctor.user.lastname} has created a new prescription for you`
          });
          
          console.log(`WebSocket notification to patient ${patientUserId}: ${patientSuccess ? 'Sent' : 'Failed'}`);
        }
        
        // Send to doctor
        const doctorUserId = request.user.id;
        const doctorSuccess = fastify.websocket.sendToUser(doctorUserId, {
          type: 'PRESCRIPTION_CREATED',
          data: {
            prescriptionId: prescription.prescription.id,
            patientName: `${prescription.prescription.patient.user.firstname} ${prescription.prescription.patient.user.lastname}`,
            details: prescription.prescription.details,
            items: prescription.prescription.items,
            timestamp: new Date().toISOString()
          },
          message: `You created a prescription for ${prescription.prescription.patient.user.firstname} ${prescription.prescription.patient.user.lastname}`
        });
        
        console.log(`WebSocket notification to doctor ${doctorUserId}: ${doctorSuccess ? 'Sent' : 'Failed'}`);
        
        // Send to pharmacy if assigned
        if (prescription.prescription.pharmacy?.user?.id) {
          const pharmacyUserId = prescription.prescription.pharmacy.user.id;
          const pharmacySuccess = fastify.websocket.sendToUser(pharmacyUserId, {
            type: 'PRESCRIPTION_CREATED',
            data: {
              prescriptionId: prescription.prescription.id,
              doctorName: `${prescription.prescription.doctor.user.firstname} ${prescription.prescription.doctor.user.lastname}`,
              patientName: `${prescription.prescription.patient.user.firstname} ${prescription.prescription.patient.user.lastname}`,
              details: prescription.prescription.details,
              items: prescription.prescription.items,
              timestamp: new Date().toISOString()
            },
            message: `New prescription received from Dr. ${prescription.prescription.doctor.user.lastname} for patient ${prescription.prescription.patient.user.lastname}`
          });
          
          console.log(`WebSocket notification to pharmacy ${pharmacyUserId}: ${pharmacySuccess ? 'Sent' : 'Failed'}`);
        }
      } else {
        console.log('WebSocket functionality not available for real-time notifications');
      }
      
      return prescription;
    } catch (error) {
      reply.code(error.statusCode || 500).send({ error: error.message });
    }
  }
});

  // Update prescription
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.updatePrescription(request.params.id, request.body);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Delete prescription
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        const prescription = await PrescriptionService.deletePrescription(request.params.id);
        return prescription;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });

  // Get prescriptions by patient ID
  fastify.get('/patient/:patientId', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'PHARMACY','PATIENT'])],
    config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
    handler: async (request, reply) => {
      try {
        const prescriptions = await PrescriptionService.getPrescriptionsByPatientId(request.params.patientId);
        return prescriptions;
      } catch (error) {
        reply.code(error.statusCode || 500).send({ error: error.message });
      }
    }
  });
}