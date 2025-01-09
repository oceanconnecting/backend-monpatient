import { DoctorPatientService } from '../services/doctor-patient.service.js'
import { checkRole } from '../middleware/auth.middleware.js'

export async function doctorPatientRoutes(fastify) {
  // Send request to doctor
  fastify.post('/request', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    schema: {
      body: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'number' },
          message: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.patient) {
          reply.code(400).send({ error: 'User is not a patient' })
          return
        }

        const result = await DoctorPatientService.sendRequest(
          request.user.patient.id,
          request.body.doctorId,
          request.body.message
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // Handle request (accept/reject)
  fastify.put('/request/:requestId', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    schema: {
      params: {
        type: 'object',
        required: ['requestId'],
        properties: {
          requestId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACCEPTED', 'REJECTED'] }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: 'User is not a doctor' })
          return
        }

        const result = await DoctorPatientService.handleRequest(
          request.params.requestId,
          request.user.doctor.id,
          request.body.status
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // Get patient's doctors
  fastify.get('/patient/doctors', {
    onRequest: [fastify.authenticate, checkRole(['PATIENT'])],
    handler: async (request, reply) => {
      try {
        if (!request.user.patient) {
          reply.code(400).send({ error: 'User is not a patient' })
          return
        }

        const doctors = await DoctorPatientService.getPatientDoctors(request.user.patient.id)
        return doctors
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // Get doctor's patients
  fastify.get('/doctor/patients', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: 'User is not a doctor' })
          return
        }

        const patients = await DoctorPatientService.getDoctorPatients(request.user.doctor.id)
        return patients
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // Get pending requests for doctor
  fastify.get('/doctor/requests', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: 'User is not a doctor' })
          return
        }

        const requests = await DoctorPatientService.getPendingRequests(request.user.doctor.id)
        return requests
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  // End doctor-patient relationship
  fastify.delete('/relationship/:patientId', {
    onRequest: [fastify.authenticate, checkRole(['DOCTOR'])],
    schema: {
      params: {
        type: 'object',
        required: ['patientId'],
        properties: {
          patientId: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        if (!request.user.doctor) {
          reply.code(400).send({ error: 'User is not a doctor' })
          return
        }

        const result = await DoctorPatientService.endDoctorPatientRelationship(
          request.params.patientId,
          request.user.doctor.id
        )
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
}
