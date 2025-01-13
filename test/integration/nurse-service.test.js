import { expect } from 'chai'
import { 
  createTestApp, 
  cleanupDatabase, 
  createTestUser, 
  generateToken,
  createAuthHeader 
} from '../helpers/test-helper.js'

describe('Nurse Service Routes', () => {
  let app
  let patientUser
  let nurseUser
  let patientToken
  let nurseToken
  let serviceRequest

  before(async () => {
    await cleanupDatabase()
    app = await createTestApp()

    // Create test users
    patientUser = await createTestUser('PATIENT')
    nurseUser = await createTestUser('NURSE')

    // Generate tokens
    patientToken = await generateToken(app, patientUser.user)
    nurseToken = await generateToken(app, nurseUser.user)
  })

  after(async () => {
    await cleanupDatabase()
    await app.close()
  })

  describe('POST /api/nurse-service/request', () => {
    const requestData = {
      serviceType: 'Home Care',
      description: 'Need assistance with daily activities',
      preferredDate: new Date().toISOString(),
      urgency: 'Medium',
      location: 'Home Address'
    }

    it('should create a service request when authenticated as patient', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/nurse-service/request',
        headers: createAuthHeader(patientToken),
        payload: requestData
      })

      expect(response.statusCode).to.equal(200)
      const result = JSON.parse(response.body)
      expect(result).to.have.property('serviceType', requestData.serviceType)
      expect(result).to.have.property('status', 'REQUESTED')
      serviceRequest = result // Save for later tests
    })

    it('should reject request when not authenticated as patient', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/nurse-service/request',
        headers: createAuthHeader(nurseToken),
        payload: requestData
      })

      expect(response.statusCode).to.equal(403)
    })
  })

  describe('GET /api/nurse-service/available', () => {
    it('should return available requests when authenticated as nurse', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nurse-service/available',
        headers: createAuthHeader(nurseToken)
      })

      expect(response.statusCode).to.equal(200)
      const requests = JSON.parse(response.body)
      expect(requests).to.be.an('array')
      expect(requests.length).to.be.at.least(1)
      expect(requests[0]).to.have.property('status', 'REQUESTED')
    })

    it('should reject when not authenticated as nurse', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nurse-service/available',
        headers: createAuthHeader(patientToken)
      })

      expect(response.statusCode).to.equal(403)
    })
  })

  describe('PUT /api/nurse-service/accept/:requestId', () => {
    it('should allow nurse to accept request', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/nurse-service/accept/${serviceRequest.id}`,
        headers: createAuthHeader(nurseToken)
      })

      expect(response.statusCode).to.equal(200)
      const result = JSON.parse(response.body)
      expect(result).to.have.property('status', 'ACCEPTED')
      expect(result).to.have.property('nurseId', nurseUser.roleData.id)
    })

    it('should reject when not authenticated as nurse', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/nurse-service/accept/${serviceRequest.id}`,
        headers: createAuthHeader(patientToken)
      })

      expect(response.statusCode).to.equal(403)
    })
  })

  describe('PUT /api/nurse-service/status/:requestId', () => {
    it('should allow nurse to update service status', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/nurse-service/status/${serviceRequest.id}`,
        headers: createAuthHeader(nurseToken),
        payload: {
          status: 'IN_PROGRESS',
          notes: 'Started the service'
        }
      })

      expect(response.statusCode).to.equal(200)
      const result = JSON.parse(response.body)
      expect(result).to.have.property('status', 'IN_PROGRESS')
      expect(result).to.have.property('notes', 'Started the service')
    })

    it('should reject invalid status update', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/nurse-service/status/${serviceRequest.id}`,
        headers: createAuthHeader(nurseToken),
        payload: {
          status: 'INVALID_STATUS',
          notes: 'Test notes'
        }
      })

      expect(response.statusCode).to.equal(400)
    })

    it('should reject when not authenticated as nurse', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/nurse-service/status/${serviceRequest.id}`,
        headers: createAuthHeader(patientToken),
        payload: {
          status: 'COMPLETED',
          notes: 'Test notes'
        }
      })

      expect(response.statusCode).to.equal(403)
    })
  })
})
