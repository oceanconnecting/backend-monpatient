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

    // Get doctor and patient details for notifications
    const [doctor, patient] = await Promise.all([
      prisma.doctor.findUnique({
        where: { id: parseInt(doctorId) },
        include: { user: true }
      }),
      prisma.patient.findUnique({
        where: { id: parseInt(patientId) },
        include: { user: true }
      })
    ])

    // Create new request
    const request = await prisma.doctorPatientRequest.create({
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

    // Create notification for doctor
    await prisma.notification.create({
      data: {
        userId: doctor.user.id,
        type: 'DOCTOR_REQUEST',
        title: 'New Patient Request',
        message: `Patient ${patient.name} has requested to be added to your patient list`,
        metadata: {
          requestId: request.id,
          patientId: patientId,
          patientName: patient.name
        }
      }
    })

    return request
  }

  static async handleRequest(requestId, doctorId, status) {
    const request = await prisma.doctorPatientRequest.findFirst({
      where: {
        id: parseInt(requestId),
        doctorId: parseInt(doctorId)
      },
      include: {
        patient: {
          include: { user: true }
        },
        doctor: {
          include: { user: true }
        }
      }
    })

    if (!request) {
      throw new Error('Request not found')
    }

    const updatedRequest = await prisma.doctorPatientRequest.update({
      where: { id: parseInt(requestId) },
      data: { status },
      include: {
        patient: true,
        doctor: true
      }
    })

    // Create notification for patient about the request status
    await prisma.notification.create({
      data: {
        userId: request.patient.user.id,
        type: 'DOCTOR_REQUEST_UPDATE',
        title: `Doctor Request ${status}`,
        message: `Dr. ${request.doctor.name} has ${status.toLowerCase()} your request`,
        metadata: {
          requestId: request.id,
          doctorId: doctorId,
          doctorName: request.doctor.name,
          status: status
        }
      }
    })

    // If accepted, create the doctor-patient relationship
    if (status === 'ACCEPTED') {
      await prisma.doctorPatient.create({
        data: {
          patientId: request.patientId,
          doctorId: request.doctorId,
          startDate: new Date(),
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
