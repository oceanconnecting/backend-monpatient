import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export class NurseServiceService {
  static async createServiceRequest(patientId, requestData) {
    return prisma.nurseServiceRequest.create({
      data: {
        patientId: parseInt(patientId),
        serviceType: requestData.serviceType,
        description: requestData.description,
        preferredDate: new Date(requestData.preferredDate),
        urgency: requestData.urgency,
        location: requestData.location
      },
      include: {
        patient: true
      }
    })
  }

  static async getAvailableRequests() {
    return prisma.nurseServiceRequest.findMany({
      where: {
        status: 'REQUESTED',
        nurseId: null
      },
      include: {
        patient: true
      },
      orderBy: [
        {
          urgency: 'desc'
        },
        {
          preferredDate: 'asc'
        }
      ]
    })
  }

  static async acceptRequest(requestId, nurseId) {
    const request = await prisma.nurseServiceRequest.findUnique({
      where: { id: parseInt(requestId) }
    })

    if (!request) {
      throw new Error('Service request not found')
    }

    if (request.status !== 'REQUESTED') {
      throw new Error('Service request is no longer available')
    }

    return prisma.nurseServiceRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        nurseId: parseInt(nurseId),
        status: 'ACCEPTED'
      },
      include: {
        patient: true,
        nurse: true
      }
    })
  }

  static async updateRequestStatus(requestId, nurseId, status, notes) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: parseInt(requestId),
        nurseId: parseInt(nurseId)
      }
    })

    if (!request) {
      throw new Error('Service request not found')
    }

    const data = {
      status,
      ...(notes && { notes }),
      ...(status === 'COMPLETED' && { completedAt: new Date() })
    }

    return prisma.nurseServiceRequest.update({
      where: { id: parseInt(requestId) },
      data,
      include: {
        patient: true,
        nurse: true
      }
    })
  }

  static async rateService(requestId, patientId, rating, feedback) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: parseInt(requestId),
        patientId: parseInt(patientId),
        status: 'COMPLETED'
      }
    })

    if (!request) {
      throw new Error('Completed service request not found')
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    // Update the service request with rating and feedback
    const updatedRequest = await prisma.nurseServiceRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        rating,
        feedback
      }
    })

    // Update nurse's average rating
    const nurseRequests = await prisma.nurseServiceRequest.findMany({
      where: {
        nurseId: request.nurseId,
        rating: { not: null }
      },
      select: {
        rating: true
      }
    })

    const averageRating = nurseRequests.reduce((acc, curr) => acc + curr.rating, 0) / nurseRequests.length

    await prisma.nurse.update({
      where: { id: request.nurseId },
      data: {
        rating: averageRating
      }
    })

    return updatedRequest
  }

  static async getPatientRequests(patientId) {
    return prisma.nurseServiceRequest.findMany({
      where: {
        patientId: parseInt(patientId)
      },
      include: {
        nurse: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  static async getNurseRequests(nurseId) {
    return prisma.nurseServiceRequest.findMany({
      where: {
        nurseId: parseInt(nurseId)
      },
      include: {
        patient: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  static async cancelRequest(requestId, patientId) {
    const request = await prisma.nurseServiceRequest.findFirst({
      where: {
        id: parseInt(requestId),
        patientId: parseInt(patientId),
        status: { in: ['REQUESTED', 'ACCEPTED'] }
      }
    })

    if (!request) {
      throw new Error('Active service request not found')
    }

    return prisma.nurseServiceRequest.update({
      where: { id: parseInt(requestId) },
      data: {
        status: 'CANCELLED'
      }
    })
  }
}
