import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class DoctorPatientService {
  static async sendRequest(patientId, doctorId, message) {
    // Check if request already exists
    const existingRequest = await prisma.doctorPatientRequest.findUnique({
      where: {
        patientId_doctorId: {
          patientId: parseInt(patientId),
          doctorId: parseInt(doctorId)
        }
      }
    })

    if (existingRequest) {
      throw new Error('Request already exists')
    }

    // Create new request
    return prisma.doctorPatientRequest.create({
      data: {
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        message,
        status: 'PENDING'
      },
      include: {
        patient: true,
        doctor: true
      }
    })
  }

  static async handleRequest(requestId, doctorId, status) {
    const request = await prisma.doctorPatientRequest.findFirst({
      where: {
        id: parseInt(requestId),
        doctorId: parseInt(doctorId)
      }
    })

    if (!request) {
      throw new Error('Request not found')
    }

    // Update request status
    const updatedRequest = await prisma.doctorPatientRequest.update({
      where: { id: parseInt(requestId) },
      data: { status },
      include: {
        patient: true,
        doctor: true
      }
    })

    // If accepted, create doctor-patient relationship
    if (status === 'ACCEPTED') {
      await prisma.doctorPatient.create({
        data: {
          patientId: request.patientId,
          doctorId: request.doctorId,
          active: true
        }
      })
    }

    return updatedRequest
  }

  static async getPatientDoctors(patientId) {
    return prisma.doctorPatient.findMany({
      where: {
        patientId: parseInt(patientId),
        active: true
      },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true
              }
            }
          }
        }
      }
    })
  }

  static async getDoctorPatients(doctorId) {
    return prisma.doctorPatient.findMany({
      where: {
        doctorId: parseInt(doctorId),
        active: true
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true
              }
            }
          }
        }
      }
    })
  }

  static async getPendingRequests(doctorId) {
    return prisma.doctorPatientRequest.findMany({
      where: {
        doctorId: parseInt(doctorId),
        status: 'PENDING'
      },
      include: {
        patient: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true
              }
            }
          }
        }
      }
    })
  }

  static async endDoctorPatientRelationship(patientId, doctorId) {
    return prisma.doctorPatient.update({
      where: {
        patientId_doctorId: {
          patientId: parseInt(patientId),
          doctorId: parseInt(doctorId)
        }
      },
      data: {
        active: false,
        endDate: new Date()
      }
    })
  }
}
