import { test } from 'node:test'
import { expect } from 'chai'
import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import jwt from '@fastify/jwt'

const prisma = new PrismaClient()

describe('Doctor-Patient Chat Flow', () => {
  let app
  let testPatient
  let testDoctor
  let patientToken
  let doctorToken

  before(async () => {
    // Clean up any existing test data
    await prisma.message.deleteMany()
    await prisma.chatRoom.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.doctorPatientRequest.deleteMany()
    await prisma.doctorPatient.deleteMany()
    await prisma.patient.deleteMany()
    await prisma.doctor.deleteMany()
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testpatient@test.com', 'testdoctor@test.com']
        }
      }
    })

    // Create Fastify instance
    app = Fastify()
    await buildApp(app)

    // Create test users and tokens
    const patientUser = await prisma.user.create({
      data: {
        firstname: 'Test Patient',
        lastname: 'Test Patient',
        email: 'testpatient@test.com',
        password: 'password123',
        role: 'PATIENT'
      }
    })

    testPatient = await prisma.patient.create({
      data: {
        firstname: 'Test Patient',
        lastname: 'Test Patient',
        userId: patientUser.id
      }
    })

    const doctorUser = await prisma.user.create({
      data: {
        firstname: 'Test Doctor',
        lastname: 'Test Doctor',
        email: 'testdoctor@test.com',
        password: 'password123',
        role: 'DOCTOR'
      }
    })

    testDoctor = await prisma.doctor.create({
      data: {
        specialization: 'General',
        userId: doctorUser.id
      }
    })

    // Generate tokens
    patientToken = app.jwt.sign({ 
      id: patientUser.id,
      role: 'PATIENT',
      patient: testPatient
    })

    doctorToken = app.jwt.sign({ 
      id: doctorUser.id,
      role: 'DOCTOR',
      doctor: {
        id: testDoctor.id,
        specialization: testDoctor.specialization
      }
    })
  })

  it('should allow patient to send request to doctor', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/doctor-patient/request',
      headers: {
        authorization: `Bearer ${patientToken}`
      },
      payload: {
        doctorId: testDoctor.id,
        message: 'Test request message'
      }
    })

    expect(response.statusCode).to.equal(200)
    const result = JSON.parse(response.payload)
    expect(result.status).to.equal('PENDING')
  })

  it('should allow doctor to accept request and create chat room', async () => {
    // Get the pending request
    const request = await prisma.doctorPatientRequest.findFirst({
      where: {
        patientId: testPatient.id,
        doctorId: testDoctor.id,
        status: 'PENDING'
      }
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/doctor-patient/request/${request.id}/accept`,
      headers: {
        authorization: `Bearer ${doctorToken}`
      }
    })

    expect(response.statusCode).to.equal(200)
    const result = JSON.parse(response.payload)
    expect(result.updatedRequest.status).to.equal('ACCEPTED')
    expect(result.chatRoom).to.exist

    // Verify chat room was created
    const chatRoom = await prisma.chatRoom.findFirst({
      where: {
        patientId: testPatient.id,
        doctorId: testDoctor.id
      }
    })
    expect(chatRoom).to.exist
    expect(chatRoom.status).to.equal('ACTIVE')

    // Verify notification was created
    const notification = await prisma.notification.findFirst({
      where: {
        type: 'REQUEST_ACCEPTED',
        metadata: {
          path: ['doctorId'],
          equals: testDoctor.id
        }
      }
    })
    expect(notification).to.exist
    expect(notification.metadata.chatRoomId).to.equal(chatRoom.id)
  })

  after(async () => {
    // Cleanup test data
    await prisma.message.deleteMany()
    await prisma.chatRoom.deleteMany()
    await prisma.notification.deleteMany()
    await prisma.doctorPatientRequest.deleteMany()
    await prisma.doctorPatient.deleteMany()
    await prisma.doctor.delete({ where: { id: testDoctor.id } })
    await prisma.patient.delete({ where: { id: testPatient.id } })
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testpatient@test.com', 'testdoctor@test.com']
        }
      }
    })

    // Close app
    await app.close()
  })
})
