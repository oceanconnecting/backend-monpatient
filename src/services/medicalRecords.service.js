import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const MedicalRecordService = {
  async getMedicalRecordsByPatient(patientId) {
    try {
      return await prisma.medicalRecord.findMany({
        where: { patientId },
        include: {
          nurses: true,
          doctors: true,
          patient: true,
        },
      });
    } catch (error) {
      console.error("Error fetching medical records:", error);
      throw new Error("Failed to fetch medical records");
    }
  },

  async createMedicalRecord(data, userId) {
    try {
      // First find the patient
      const patient = await prisma.patient.findUnique({
        where: { id: data.patientId },
        include: {
          doctors: {
            where: { doctorId: userId }
          },
          nurseServiceRequests: {
            where: { nurseId: userId }
          }
        }
      });
      
      if (!patient) {
        throw new Error(`Patient with ID ${data.patientId} not found`);
      }
      
      // Check if the current user has a relationship with this patient
      if (patient.doctors.length === 0 && patient.nurseServiceRequests.length === 0) {
        throw new Error("You are not authorized to create medical records for this patient");
      }
      
      // Proceed with creating the record
      return await prisma.medicalRecord.create({
        data: {
          diagnosis: data.diagnosis,
          treatment: data.treatment,
          notes: data.notes,
          patient: { connect: { id: data.patientId } }
        },
      });
    } catch (error) {
      console.error("Error creating medical record:", error);
      throw new Error(error.message || "Failed to create medical record");
    }
  },

  async updateMedicalRecord(id, updateData) {
    try {
      return await prisma.$transaction(async (prisma) => {
        // Verify record exists
        const existingRecord = await prisma.medicalRecord.findUnique({
          where: { id },
        });

        if (!existingRecord) {
          throw new Error("Medical record not found");
        }

        // Verify nurses exist if updating
        if (updateData.nurseIds) {
          const nurses = await prisma.nurse.findMany({
            where: { id: { in: updateData.nurseIds } },
          });
          if (nurses.length !== updateData.nurseIds.length) {
            throw new Error("One or more nurse IDs not found");
          }
        }

        // Verify doctors exist if updating
        if (updateData.doctorIds) {
          const doctors = await prisma.doctor.findMany({
            where: { id: { in: updateData.doctorIds } },
          });
          if (doctors.length !== updateData.doctorIds.length) {
            throw new Error("One or more doctor IDs not found");
          }
        }

        return await prisma.medicalRecord.update({
          where: { id },
          data: {
            diagnosis: updateData.diagnosis,
            treatment: updateData.treatment,
            notes: updateData.notes,
            nurses: updateData.nurseIds
              ? { set: updateData.nurseIds.map(id => ({ id })) }
              : undefined,
            doctors: updateData.doctorIds
              ? { set: updateData.doctorIds.map(id => ({ id })) }
              : undefined,
          },
        });
      });
    } catch (error) {
      console.error("Error updating medical record:", error);
      throw new Error(error.message || "Failed to update medical record");
    }
  },

  async deleteMedicalRecord(id) {
    try {
      return await prisma.medicalRecord.delete({ 
        where: { id } 
      });
    } catch (error) {
      console.error("Error deleting medical record:", error);
      throw new Error("Failed to delete medical record");
    }
  },
};