import { expect } from 'chai'
import { 
  createTestApp, 
  cleanupDatabase, 
  createTestUser, 
  generateToken,
  createAuthHeader 
} from '../helpers/test-helper.js'

describe('Admin Routes', () => {
  let app
  let adminUser
  let adminToken
  let testDoctor
  let testNurse
  let testPatient

  before(async () => {
    await cleanupDatabase()
    app = await createTestApp()
    // Create test users
    adminUser = await createTestUser('ADMIN')
    testDoctor = await createTestUser('DOCTOR')
    testNurse = await createTestUser('NURSE')
    testPatient = await createTestUser('PATIENT')

    // Generate admin token
    adminToken = await generateToken(app, adminUser.user)
  })

  after(async () => {
    await cleanupDatabase()
    await app.close()
  })

  describe('GET /api/admin/doctors', () => {
    it('should return all doctors when authenticated as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/doctors',
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(200)
      const doctors = JSON.parse(response.body)
      expect(doctors).to.be.an('array')
      expect(doctors.length).to.be.at.least(1)
      expect(doctors[0]).to.have.property('name', 'Test Doctor')
    })

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/doctors'
      })

      expect(response.statusCode).to.equal(401)
    })
  })

  describe('GET /api/admin/nurses', () => {
    it('should return all nurses when authenticated as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/nurses',
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(200)
      const nurses = JSON.parse(response.body)
      expect(nurses).to.be.an('array')
      expect(nurses.length).to.be.at.least(1)
      expect(nurses[0]).to.have.property('name', 'Test Nurse')
    })
  })

  describe('GET /api/admin/patients', () => {
    it('should return all patients when authenticated as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/patients',
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(200)
      const patients = JSON.parse(response.body)
      expect(patients).to.be.an('array')
      expect(patients.length).to.be.at.least(1)
      expect(patients[0]).to.have.property('name', 'Test Patient')
    })
  })

  describe('GET /api/admin/users/:id', () => {
    it('should return user details when authenticated as admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${testPatient.user.id}`,
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(200)
      const user = JSON.parse(response.body)
      expect(user).to.have.property('email', testPatient.user.email)
      expect(user).to.have.property('role', 'PATIENT')
    })

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users/99999',
        headers: createAuthHeader(adminToken)
      })

      expect(response.statusCode).to.equal(404)
    })
  })
})
