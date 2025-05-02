import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export class DoctorService {
  //doctors
  static async getAllDoctors() {
    const doctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
            telephoneNumber: true,
            gender: true,
         
            profilePhoto: true,
            dateOfBirth: true,
          },
        },
        patients: true,
        prescriptions: true,
        medicalRecords: true,
        chatRooms: true,
      },
    });

    return doctors.map((doctor) => ({
      id: doctor.id,
      userId: doctor.userId,
      name: `${doctor.user.firstname} ${doctor.user.lastname}`, // Construct full name
      specialization: doctor.specialization,
      availability: doctor.availability,
      rating: doctor.rating,
      email: doctor.user.email,
      role: "DOCTOR", // If role is not stored, set it manually
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      patientsCount: doctor.patients.length,
      prescriptionsCount: doctor.prescriptions.length,
      activeChatRooms: doctor.chatRooms.filter(
        (room) => room.status === "ACTIVE"
      ).length,
    }));
  }
  //get all doctors and nurses
 
  // update doctor
  static async updateDoctor(id, userData) {
    const existingDoctor = await prisma.user.findUnique({
      where: { id, role: "DOCTOR" },

      include: {
        doctor: true,
      },
    });

    if (!existingDoctor) {
      throw new Error("Doctor not found");
    }
    return await prisma.user.update({
      where: { id, role: "DOCTOR" },
      data: {
        firstname: userData.firstname,
        lastname: userData.lastname,
        role: "DOCTOR",
        telephoneNumber: userData.telephoneNumber,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
        profilePhoto: userData.profilePhoto,
        doctor: {
          update: {
            specialization: userData.doctor.specialization,
            availability: userData.doctor.availability,
            rating: userData.doctor.rating,
          },
        },
      },
    });
  }
  // create doctor
  static async createDoctor(userData) {
    return await prisma.user.create({
      data: {
        firstname: userData.firstname,
        lastname: userData.lastname,
        role: "DOCTOR",
        telephoneNumber: userData.telephoneNumber,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender,
      
        profilePhoto: userData.profilePhoto,
        doctor: {
          create: {
            specialization: userData.doctor.specialization,
            availability: userData.doctor.availability,
            rating: userData.doctor.rating,
          },
        },
      },
      include: {
        doctor: true,
      },
    });
  }
  // delete doctor
  static async deleteDoctor(id) {
    const existingDoctor = await prisma.user.findUnique({
      where: { id, role: "DOCTOR" },
      include: {
        user: true,
      },
    });

    if (!existingDoctor) {
      throw new Error("Doctor not found");
    }
    return await prisma.user.delete({
      where: { id, role: "DOCTOR" },
    });
  }
  // get dotor by id 
  static async getDoctorByid(id) {
    if (!id) {
      throw new Error("Invalid doctor ID");
    }
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
    return doctor;
  }
// seach for doctor by name
  static async searchDoctorsByName(name) {
    // If name is empty or undefined, return all doctors
    if (!name || name.trim() === "") {
      return this.getAllDoctors();
    }

    const doctors = await prisma.doctor.findMany({
      where: {
        user: {
          OR: [
            { firstname: { contains: name, mode: "insensitive" } },
            { lastname: { contains: name, mode: "insensitive" } },
          ],
        },
      },
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
            telephoneNumber: true,
            gender: true,
          
            profilePhoto: true,
            dateOfBirth: true,
          },
        },
        patients: true,
        prescriptions: true,
        medicalRecords: true,
        chatRooms: true,
      },
      orderBy: {
        user: {
          lastname: "asc",
        },
      },
    });

    return doctors.map((doctor) => ({
      id: doctor.id,
      userId: doctor.userId,
      name: `${doctor.user.firstname} ${doctor.user.lastname}`,
      specialization: doctor.specialization,
      availability: doctor.availability,
      rating: doctor.rating,
      email: doctor.user.email,
      role: "DOCTOR",
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
      patientsCount: doctor.patients.length,
      prescriptionsCount: doctor.prescriptions.length,
      activeChatRooms: doctor.chatRooms.filter(
        (room) => room.status === "ACTIVE"
      ).length,
    }));
  }
}
