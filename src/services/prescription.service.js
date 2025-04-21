import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class PrescriptionService {
  static async getAllPrescriptions() {
    try {
      const prescriptions = await prisma.prescription.findMany({
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
          items: { 
            include: { 
              medicine: true 
            } 
          }
        },
      });
  
      return prescriptions.map((prescription) => ({
        id: prescription.id,
        date: prescription.date,
        details: prescription.details,
        approved: prescription.approved,
        patient: {
          id: prescription.patient.id,
          name: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
          email: prescription.patient.user.email,
        },
        doctor: {
          id: prescription.doctor.id,
          name: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
          email: prescription.doctor.user.email,
        },
        items: prescription.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          dosage: item.dosage,
          instructions: item.instructions,
          medicine: {
            id: item.medicine.id,
            name: item.medicine.name,
            description: item.medicine.description
            // Add other medicine fields you need
          }
        })),
        pharmacy: prescription.pharmacy
          ? {
              id: prescription.pharmacy.id,
              name: prescription.pharmacy.user.firstname, // Assuming first name is the pharmacy name
              email: prescription.pharmacy.user.email,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }
  }

  static async getPrescriptionById(id) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        pharmacy: { include: { user: true } },
      },
    });

    if (!prescription) {
      throw new Error('Prescription not found');
    }

    return prescription;
  }

  static async createPrescription(doctorId, data) {
    if (!data.patientId || !data.details) {
      throw new Error('Missing required fields (patientId, doctorId, details)');
    }
  
    // Validate prescription items
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Prescription must include at least one item');
    }
  
    return await prisma.$transaction(async (tx) => {
      // Create the prescription first
      const prescription = await tx.prescription.create({
        data: {
          details: data.details,
          approved: data.approved ?? false,
          patient: { connect: { id: data.patientId } },
          doctor: { connect: { id: doctorId } },
          pharmacy: data.pharmacyId ? { connect: { id: data.pharmacyId } } : undefined,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
        },
      });
  
      // Process each prescription item
      for (const item of data.items) {
        // Check if medicine exists by name or id
        let medicineId = item.medicineId;
        
        if (!medicineId && item.medicine) {
          // If there's medicine data but no ID, try to find existing medicine or create new one
          let medicine;
          
          if (item.medicine.name) {
            // Try to find existing medicine by name
            medicine = await tx.medicineofPrescription.findFirst({
              where: { name: item.medicine.name }
            });
          }
          
          if (!medicine) {
            // Create new medicine if not found
            medicine = await tx.medicineofPrescription.create({
              data: {
                name: item.medicine.name,
                description: item.medicine.description,
                dosage: item.medicine.dosage,
                manufacturer: item.medicine.manufacturer,
                category: item.medicine.category,
                sideEffects: item.medicine.sideEffects,
                instructions: item.medicine.instructions,
              }
            });
          }
          
          medicineId = medicine.id;
        }
        
        if (!medicineId) {
          throw new Error('Medicine ID or medicine data is required for prescription items');
        }
  
        // Create prescription item
        await tx.prescriptionItem.create({
          data: {
            quantity: item.quantity,
            instructions: item.instructions,
            duration: item.duration,
            refills: item.refills ?? 0,
            medicine: { connect: { id: medicineId } },
            prescription: { connect: { id: prescription.id } }
          }
        });
      }
  
      // Return the prescription with all items included
      return await tx.prescription.findUnique({
        where: { id: prescription.id },
        include: {
          patient: { include: { user: {
            select:{
              firstname:true,
              lastname:true,
              email:true,

            }
          } } },
          doctor: { include:  { user: {
            select:{
              firstname:true,
              lastname:true,
              email:true,

            }
          } } },
          pharmacy: { include: { user: true } },
          items: true
        }
      });
    },
    {
      timeout: 10000 // Increased timeout to 10 seconds
    }
  );
  }

  static async updatePrescription(id, data) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }

    const existingPrescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!existingPrescription) {
      throw new Error('Prescription not found');
    }

    return await prisma.prescription.update({
      where: { id },
      data: {
        details: data.details,
        approved: data.approved,
        pharmacy: data.pharmacyId ? { connect: { id: data.pharmacyId } } : undefined,
      },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        pharmacy: { include: { user: true } },
      },
    });
  }

  static async deletePrescription(id) {
    if (!id) {
      throw new Error('Invalid prescription ID');
    }
    const existingPrescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!existingPrescription) {
      throw new Error('Prescription not found');
    }

    await prisma.prescription.delete({ where: { id } });

    return { message: 'Prescription deleted successfully' };
  }
  static async getPrescriptionsByPatientId(patientId) {
    if (!patientId) {
      throw new Error('Invalid patient ID');
    }

    try {
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
        },
        include: {
          patient: { include: { user: true } },
          doctor: { include: { user: true } },
          pharmacy: { include: { user: true } },
        },
        orderBy: {
          date: 'desc', // Optional: order by date descending (newest first)
        },
      });

      return prescriptions.map((prescription) => ({
        id: prescription.id,
        date: prescription.date,
        details: prescription.details,
        approved: prescription.approved,
        patient: {
          id: prescription.patient.id,
          name: `${prescription.patient.user.firstname} ${prescription.patient.user.lastname}`,
          email: prescription.patient.user.email,
        },
        doctor: {
          id: prescription.doctor.id,
          name: `${prescription.doctor.user.firstname} ${prescription.doctor.user.lastname}`,
          email: prescription.doctor.user.email,
        },
        pharmacy: prescription.pharmacy
          ? {
              id: prescription.pharmacy.id,
              name: prescription.pharmacy.user.firstname,
              email: prescription.pharmacy.user.email,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch patient prescriptions: ${error.message}`);
    }
  }
}
