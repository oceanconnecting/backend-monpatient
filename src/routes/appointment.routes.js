import { AppointmentService } from "../services/appointment.service.js";
import { checkRole } from "../middleware/auth.middleware.js";

export function registerAppointmentRoutes(fastify) {
    // Create a new appointment
    const appointmentService = new AppointmentService();
    const appointmentSchema = {
      schema: {
        body: {
          type: 'object',
          required: ['date', 'patientId'],
          properties: {
            date: { type: 'string', format: 'date-time' },
            appointmentType: { type: ['string', 'null'] },
            cancelReason: { type: ['string', 'null'] },
            isVirtual: { type: 'boolean', default: false },
            meetingLink: { type: ['string', 'null'] },
            reminderSent: { type: 'boolean', default: false },
            patientId: { type: 'string' },
            cancelledAt: { type: ['string', 'null'], format: 'date-time' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              appointmentType: { type: ['string', 'null'] },
              cancelReason: { type: ['string', 'null'] },
              isVirtual: { type: 'boolean' },
              meetingLink: { type: ['string', 'null'] },
              reminderSent: { type: 'boolean' },
              doctorId: { type: 'string' },
              patientId: { type: 'string' },
              cancelledAt: { type: ['string', 'null'], format: 'date-time' }
            }
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' }
            }
          }
        }
      },
      onRequest: [fastify.authenticate, checkRole(['DOCTOR'])]
    };
  
    fastify.post('/', appointmentSchema, async (request, reply) => {
      try {
        // Ensure user is authenticated and has doctor information
        if (!request.user || !request.user.doctor || !request.user.doctor.id) {
          return reply.code(401).send({ error: 'Unauthorized: Doctor information not available' });
        }
    
        // Create appointment data by combining request body and doctor ID
        const appointmentData = {
          ...request.body,
          doctorId: request.user.doctor.id
        };
    
        // Convert date string to Date object
        if (typeof appointmentData.date === 'string') {
          appointmentData.date = new Date(appointmentData.date);
        }
        
        // Convert cancelledAt string to Date object if present
        if (typeof appointmentData.cancelledAt === 'string') {
          appointmentData.cancelledAt = new Date(appointmentData.cancelledAt);
        }
        
        const appointment = await appointmentService.createAppointment(appointmentData);
        return reply.code(201).send(appointment);
      } catch (error) {
        return reply.code(400).send({ error: error.message });
      }
    }); 
    // Get all appointments with optional filtering
    fastify.get('/', {
      onRequest: [fastify.authenticate, checkRole(['ADMIN'])]
    }, async (request, reply) => {
      try {
        const query = request.query;
        const filters = {};
        
        if (query.date) {
          filters.date = new Date(query.date);
        }
        
        if (query.appointmentType) {
          filters.appointmentType = query.appointmentType;
        }
        
        if (query.isVirtual !== undefined) {
          filters.isVirtual = query.isVirtual === 'true';
        }
        
        if (query.reminderSent !== undefined) {
          filters.reminderSent = query.reminderSent === 'true';
        }
        
        if (query.isCancelled !== undefined) {
          filters.isCancelled = query.isCancelled === 'true';
        }
        
        const appointments = await appointmentService.getAllAppointments(filters);
        return reply.send(appointments);
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    });
    // Get a single appointment by ID
    fastify.get('/:id', {
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN', 'PATIENT'])]
    }, async (request, reply) => {
      try {
        const { id } = request.params;
        const appointment = await appointmentService.getAppointmentById(id);
        
        // If user is a patient, verify they have access to this appointment
        if (request.user.role === 'PATIENT' && request.user.patient && 
            appointment.patientId !== request.user.patient.id) {
          return reply.code(403).send({ error: 'Forbidden: Not your appointment' });
        }
        
        return reply.send(appointment);
      } catch (error) {
        if (error.message === 'Appointment not found') {
          return reply.code(404).send({ error: 'Appointment not found' });
        }
        return reply.code(500).send({ error: error.message });
      }
    });
  
    // Update an appointment
    fastify.put('/:id', {
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN'])]
    }, async (request, reply) => {
      try {
        const { id } = request.params;
        const updateData = request.body;
        
        // Convert date string to Date object if needed
        if (typeof updateData.date === 'string') {
          updateData.date = new Date(updateData.date);
        }
        
        const appointment = await appointmentService.updateAppointment(id, updateData);
        return reply.send(appointment);
      } catch (error) {
        if (error.message.includes('Record to update not found')) {
          return reply.code(404).send({ error: 'Appointment not found' });
        }
        return reply.code(400).send({ error: error.message });
      }
    });
  
    // Cancel an appointment
    fastify.patch('/:id/cancel', {
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN', 'PATIENT'])]
    }, async (request, reply) => {
      try {
        const { id } = request.params;
        const { cancelReason } = request.body;
        
        // If user is a patient, verify they have access to this appointment
        if (request.user.role === 'PATIENT') {
          const appointment = await appointmentService.getAppointmentById(id);
          if (request.user.patient && appointment.patientId !== request.user.patient.id) {
            return reply.code(403).send({ error: 'Forbidden: Not your appointment' });
          }
        }
        
        const appointment = await appointmentService.cancelAppointment(id, cancelReason);
        return reply.send(appointment);
      } catch (error) {
        if (error.message.includes('Record to update not found')) {
          return reply.code(404).send({ error: 'Appointment not found' });
        }
        return reply.code(400).send({ error: error.message });
      }
    });
  
    // Delete an appointment
    fastify.delete('/:id', {
      onRequest: [fastify.authenticate, checkRole(['ADMIN'])]
    }, async (request, reply) => {
      try {
        const { id } = request.params;
        await appointmentService.deleteAppointment(id);
        return reply.code(204).send();
      } catch (error) {
        if (error.message.includes('Record to delete does not exist')) {
          return reply.code(404).send({ error: 'Appointment not found' });
        }
        return reply.code(500).send({ error: error.message });
      }
    });
  
    // Mark reminder as sent
    fastify.patch('/:id/mark-reminder-sent', {
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN', 'SYSTEM'])]
    }, async (request, reply) => {
      try {
        const { id } = request.params;
        const appointment = await appointmentService.markReminderSent(id);
        return reply.send(appointment);
      } catch (error) {
        if (error.message.includes('Record to update not found')) {
          return reply.code(404).send({ error: 'Appointment not found' });
        }
        return reply.code(400).send({ error: error.message });
      }
    });
  
    // Get appointments that need reminders
    fastify.get('/need-reminders', {
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN'])]
    }, async (request, reply) => {
      try {
        const { hoursAhead } = request.query;
        const hoursAheadNum = hoursAhead ? parseInt(hoursAhead, 10) : 24;
        
        const appointments = await appointmentService.getUpcomingAppointmentsNeedingReminders(hoursAheadNum);
        return reply.send(appointments);
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    });
    fastify.get('/doctor', {
       schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
        }
      }
    },
      config: {
    cache: {
      expiresIn: 300000 // 5 minutes in milliseconds
    }
  },
      onRequest: [fastify.authenticate, checkRole(['DOCTOR', 'ADMIN'])]
      
    }, async (request, reply) => {
      try {
        const doctorId  = request.user.doctor.id;
         const { page = 1, limit = 10 } = request.query;
        const appointments = await AppointmentService.doctorGetAppointment(doctorId, page,
          limit);
        return reply.send(appointments);
      } catch (error) {
        return reply.code(500).send({ error: error.message });
      }
    });
  }