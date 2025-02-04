import { AdminService } from '../services/admin.service.js'
import { PatientService } from '../services/patients.service.js'
import { PharmacyService } from '../services/pharmacies.service.js'
import { DoctorService } from '../services/doctor.service.js'
import { NurseService } from '../services/nurse.service.js'
import { checkRole } from '../middleware/auth.middleware.js'

export async function adminRoutes(fastify) {

  //users
  fastify.get('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              email: { type: 'string' },
              role: { type: 'string' },
              firstname: { type: 'string' },
              lastname: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const users = await AdminService.getAllUsers()
        return users
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.get('/users/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const id = parseInt(request.params.id)
        if (isNaN(id)) {
          reply.code(400).send({ error: 'Invalid user ID' })
          return
        }

        const user = await AdminService.getUserById(id)
        if (!user) {
          reply.code(404).send({ error: 'User not found' })
          return
        }
        return user
      } catch (error) {
        if (error.code === 'P2001') {
          reply.code(404).send({ error: 'User not found' })
        } else {
          reply.code(500).send({ error: error.message })
        }
      }
    }
  })
  fastify.post('/', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'] },
          firstname: { type: 'string' },
          lastname: { type: 'string' },
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const user = await AdminService.createUser(request.body)
        return user
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.put('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
      
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const updatedUser = await AdminService.updateUser(request.params.id, request.body)
        return updatedUser
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await AdminService.deleteUser(request.params.id)
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  //chat
  fastify.get('/chat/room', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const rooms = await AdminService.getAdminChatRooms(request.params.id)
        return rooms
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  //chat//nurses
  fastify.get('/chat/room/nurse', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const rooms = await AdminService.getAdminChatRoomNurse(request.params.id)
        return rooms
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  //doctors
  fastify.get('/doctors', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const doctors = await DoctorService.getAllDoctors()
        return doctors
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.get('/doctors/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const id = parseInt(request.params.id)
        if (isNaN(id)) {
          reply.code(400).send({ error: 'Invalid user ID' })
          return
        }
        const doctor = await DoctorService.getDoctorByid(id)
        return doctor
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.post('/doctors', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          role: { type: 'string', enum: ['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'] },
    
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const doctor = await DoctorService.createDoctor(request.body)
        return doctor
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.put('/doctors/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }, // Validate that the ID is a string
        },
      },
      body: {
        type: 'object',
        required: [], // Specify required fields if necessary
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          specialization: { type: 'string' },
          availability: { type: 'boolean' },
        },
        additionalProperties: false, // Restrict extra fields
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
  
      // Call the service layer to update the user
      const updatedUser = await DoctorService.updateUser(id, updateData);
  
      if (!updatedUser) {
        return reply.code(404).send({ error: 'Doctor not found' });
      }
  
      return reply.code(200).send(updatedUser);
    } catch (error) {
      // Log the error and send a proper response
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });
  fastify.delete('/doctors/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await DoctorService.deleteUser(request.params.id)
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })

  //nurses
  fastify.get('/nurses', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const nurses = await NurseService.getAllNurses()
        return nurses
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.post("/nurses", {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          firstname: { type: 'string' },
          lastname: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const nurse = await NurseService.createNurse(request.body)
        return nurse
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.put('/nurses/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
          role: { type: 'string', enum: ['PATIENT', 'NURSE', 'DOCTOR', 'PHARMACY', 'ADMIN'] },
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseService.UpdateNurse(request.params.id, request.body)
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.delete('/nurses/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await NurseService.deleteNurse(request.params.id)
        return result
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.get('/nurses/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const id = parseInt(request.params.id)
        if (isNaN(id)) {
          reply.code(400).send({ error: 'Invalid user ID' })
          return
        }
        const nurse = await NurseService.getNurseByid(id)
        return nurse
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })

  //patients
  fastify.get('/patients', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const patients = await PatientService.getAllPatients()
        return patients
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.get('/patients/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const id = parseInt(request.params.id)
        if (isNaN(id)) {
          reply.code(400).send({ error: 'Invalid user ID' })
          return
        }
        const patient = await PatientService.getAllPatients(id)
        return patient
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
  })
  fastify.post('/patients', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'role'],
        properties: {
          name: { type: 'string' },      
          specialization: { type: 'string' },
          availability: { type: 'boolean' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const patient = await PatientService.createPatient(request.body)
        return patient
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
  })
  fastify.put('/patients/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }, // Validate that the ID is a string
        },
      },
      body: {
        type: 'object',
        required: [], // Specify required fields if necessary
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' },
        
          specialization: { type: 'string' },
          availability: { type: 'boolean' },
        },
        additionalProperties: false, // Restrict extra fields
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
  
      // Call the service layer to update the user
      const updatedUser = await PatientService.updateUser(id, updateData);
  
      if (!updatedUser) {
        return reply.code(404).send({ error: 'Patient not found' });
      }
  
      return reply.code(200).send(updatedUser);
    } catch (error) {
      // Log the error and send a proper response
      request.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });
  fastify.delete('/patients/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await PatientService.deletePatientById(request.params.id)
        return result
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  }
  })

  //pharmacies
   fastify.get('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    handler: async (request, reply) => {
      try {
        const pharmacies = await PharmacyService.getAllPharmacies()
        return pharmacies
      } catch (error) {
        reply.code(500).send({ error: error.message })
      }
    }
   })
   fastify.get('/pharmacies/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const id = parseInt(request.params.id)
        if (isNaN(id)) {
          reply.code(400).send({ error: 'Invalid user ID' })
          return
        }
        const pharmacy = await PharmacyService.getPharmacyByid(id)
        return pharmacy
      } catch (error) { 
        reply.code(500).send({ error: error.message })
      }
    }
   })
   fastify.post('/pharmacies', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'location'],
        properties: {
          name: { type: 'string' },
          location: { type: 'string' },
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const pharmacy = await PharmacyService.createPharmacy(request.body)
        return pharmacy
      } catch (error) {
        reply.code(400).send({ error: error.message })
      }
    }
   })
   fastify.delete('/pharmacies/:id', {
    onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    },
    handler: async (request, reply) => {
      try {
        const result = await PharmacyService.deleteUser(request.params.id)
        return result
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  }
   })
   fastify.put('/pharmacies/:id', {
   onRequest: [fastify.authenticate, checkRole(['ADMIN'])],
   schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }, // Validate that the ID is a string
      },
    },
    body: {
      type: 'object',
      required: [], // Specify required fields if necessary
      properties: {
        name: { type: 'string' },
        location: { type: 'string' },
      },
      additionalProperties: false, // Restrict extra fields
    },
  },
}, async (request, reply) => {
  try {
    const { id } = request.params;
    const updateData = request.body;
  
    // Call the service layer to update the user
    const updatedUser = await PharmacyService.updateUser(id, updateData);
  
    if (!updatedUser) {
      return reply.code(404).send({ error: 'Pharmacy not found' });
    }
  
    return reply.code(200).send(updatedUser);
  } catch (error) {
    console.log(error)
    // Log the error and send a proper response
    request.log.error(error);
    return reply.code(400).send({ error: error.message });
  }
   });
}
