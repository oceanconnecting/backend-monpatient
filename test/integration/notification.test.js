import { expect } from 'chai'
import { PrismaClient } from '@prisma/client'
import { 
  createTestApp, 
  cleanupDatabase, 
  createTestUser, 
  generateToken,
  createAuthHeader 
} from '../helpers/test-helper.js'

const prisma = new PrismaClient()

describe('Notification Routes', () => {
  let app
  let adminUser
  let patientUser
  let doctorUser
  let adminToken
  let patientToken
  let doctorToken
  let testNotification

  before(async () => {
    await cleanupDatabase()
    app = await createTestApp()
    // Create test users
    adminUser = await createTestUser('ADMIN')
    patientUser = await createTestUser('PATIENT')
    doctorUser = await createTestUser('DOCTOR')

    // Generate tokens
    adminToken = await generateToken(app, adminUser.user)
    patientToken = await generateToken(app, patientUser.user)
    doctorToken = await generateToken(app, doctorUser.user)

    // Create a test notification
    testNotification = await prisma.notification.create({
      data: {
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'APPOINTMENT',
        userId: patientUser.user.id
      }
    })
  })

  after(async () => {
    await cleanupDatabase()
    await app.close()
  })

  describe('GET /api/notifications', () => {
    it('should return user notifications when authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: createAuthHeader(patientToken)
      })

      expect(response.statusCode).to.equal(200)
      const notifications = JSON.parse(response.body)
      expect(notifications).to.be.an('array')
      expect(notifications.length).to.be.at.least(1)
      expect(notifications[0]).to.have.property('title', 'Test Notification')
    })

    it('should return all notifications for admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(200)
      const notifications = JSON.parse(response.body)
      expect(notifications).to.be.an('array')
      expect(notifications.length).to.be.at.least(1)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/notifications'
      })

      expect(response.statusCode).to.equal(401)
    })
  })

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/notifications/${testNotification.id}/read`,
        headers: createAuthHeader(patientToken)
      })

      expect(response.statusCode).to.equal(200)
      const notification = JSON.parse(response.body)
      expect(notification).to.have.property('read', true)
    })

    it('should return 404 for non-existent notification', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/notifications/99999/read',
        headers: createAuthHeader(patientToken)
      })

      expect(response.statusCode).to.equal(404)
    })

    it('should return 403 when accessing another user\'s notification', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/notifications/${testNotification.id}/read`,
        headers: createAuthHeader(doctorToken)
      })

      expect(response.statusCode).to.equal(403)
    })
  })

  describe('POST /api/notifications', () => {
    it('should create a new notification for admin', async () => {
      const notificationData = {
        title: 'New Test Notification',
        message: 'This is a new test notification',
        type: 'SYSTEM',
        userId: patientUser.user.id
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/notifications',
        headers: createAuthHeader(adminToken),
        payload: notificationData
      })

      expect(response.statusCode).to.equal(201)
      const notification = JSON.parse(response.body)
      expect(notification).to.have.property('title', notificationData.title)
      expect(notification).to.have.property('message', notificationData.message)
    })

    it('should return 403 when non-admin tries to create notification', async () => {
      const notificationData = {
        title: 'New Test Notification',
        message: 'This is a new test notification',
        type: 'SYSTEM',
        userId: patientUser.user.id
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/notifications',
        headers: createAuthHeader(patientToken),
        payload: notificationData
      })

      expect(response.statusCode).to.equal(403)
    })
  })
})
