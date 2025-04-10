import { PrismaClient } from "@prisma/client";
import { AuthService } from ".././auth/auth.service.js";

const prisma = new PrismaClient();

export class AdminService {
  //users
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        profilePhoto: true,
        firstname: true,
        lastname: true,
        telephoneNumber: true,
        dateOfBirth: true,
        gender: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        patient: true, // Include patient details
        doctor: true, // Include doctor details
        nurse: true, // Include nurse details
        pharmacy: true, // Include pharmacy details
        admin: true, // Include admin details
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users.map((user) => {
      // Extract role-specific data dynamically
      const roleData = user[user.role.toLowerCase()] || {};

      // Remove role-specific fields from the base user object
      const { patient, nurse, doctor, pharmacy, admin, ...baseUser } = user;

      // Merge base user data with role-specific data
      return {
        ...baseUser,
        ...roleData, // Add only the relevant role data
      };
    });
  }
  static async getUserById(id) {
    if (!id) {
      throw new Error("Invalid user ID");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Exclude password
        patient: true,
        nurse: {
          select: {
            id: true,
            availability: true,
            rating: true,
            professionalLicenseNumber: true,
            nursingCertification: true,
            hospitalAffiliation: true,
            yearsOfExperience: true,
            nurseVisits: true,
            medicalRecords: true,
            serviceRequests: true,
            nurseChats: true,
          },
        },
        doctor: {
          select: {
            id: true,
            specialization: true,
            professionalLicenseNumber: true,
            medicalDiploma: true,
            hospitalAffiliation: true,
            experience: true,
            patients: true,
            patientRequests: true,
            medicalRecords: true,
            prescriptions: true,
            chatRooms: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            pharmacyName: true,
            pharmacyLicenseNumber: true,
            pharmacyAddress: true,
            contactName: true,
            openingHours: true,
            deliveryOptions: true,
          },
        },
        admin: {
          select: {
            id: true,
            reports: true,
          },
        },
      },
    });

    if (!user) {
      const error = new Error("User not found");
      error.code = "P2001";
      throw error;
    }

    // Ensure `user.role` is a valid property
    const roleKey = user.role ? user.role.toLowerCase() : null;
    const roleSpecificData = roleKey && user[roleKey] ? user[roleKey] : {};

    // Remove all role-specific fields from the base user
    const { patient, nurse, doctor, pharmacy, admin, ...baseUser } = user;

    // Return combined data
    return {
      ...baseUser,
      ...roleSpecificData,
    };
  }
  static async updateUser(id, userData) {
    const existingUser = await prisma.user.findUnique({
      where: { id, role: "ADMIN" },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true,
      },
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    // Prepare update data
    const updateData = {
      email: userData.email,
      ...(userData.password && {
        password: await AuthService.hashPassword(userData.password),
      }),
    };

    // Prepare role-specific update
    const roleModel = existingUser.role.toLowerCase();
    const roleUpdateData = {
      firstname: userData.firstname,
      lastname: userData.lastname,
      ...(roleModel === "patient" && {
        firstname: userData.firstname,
        lastname: userData.lastname,
      }),
      ...(roleModel === "doctor" && {
        specialization: userData.specialization,
      }),
      ...(roleModel === "pharmacy" && {
        location: userData.location,
      }),
      ...(roleModel === "nurse" && {
        availability: userData.availability,
      }),
      ...(roleModel === "admin" && {
        firstname: userData.firstname,
        lastname: userData.lastname,
      }),
    };
    // Update both user and role data
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        [roleModel]: {
          update: roleUpdateData,
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        patient: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
        nurse: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            availability: true,
            rating: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            specialization: true,
          },
        },
        pharmacy: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            location: true,
          },
        },
        admin: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    });

    // Get the role-specific data
    const roleSpecificData = updatedUser[updatedUser.role.toLowerCase()];
    // Remove all role fields
    const { patient, nurse, doctor, pharmacy, admin, ...baseUser } =
      updatedUser;
    // Return combined data
    return {
      ...baseUser,
      ...roleSpecificData,
    };
  }
  static async deleteUser(id) {
    const user = await prisma.user.findUnique({
      where: { id, role: "ADMIN" },
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true,
        admin: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Delete the user (this will cascade delete role-specific data)
    await prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  }
  static async createUser(data) {
    return await prisma.user.create({
      data,
    });
  }
  //admins
  static async getAllAdmins() {
    const users = await prisma.user.findMany({
      where: {
        role: "ADMIN",
      },
      include: {
        admin: {
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.id,
      userId: user.userId,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      telephoneNumber: user.telephoneNumber,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      profilePhoto: user.profilePhoto,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }
  static async updateAdminById(id, data) {
    if (!id) {
      throw new Error("Invalid admin ID");
    }
    const admin = await prisma.user.findUnique({
      where: { id, role: "ADMIN" },
    });

    if (!admin) {
      throw new Error("Admin not found");
    }
    return await prisma.admin.update({
      where: { id },
      data,
    });
  }
  static async deleteAdmin(id) {
    const admin = await prisma.user.findFirst({
      where: { id, role: "ADMIN" },
      include: {
        admin: true,
      },
    });
    if (!admin) {
      throw new Error("Admin not found");
    }
    // Delete the admin (this will cascade delete role-specific data)
    await prisma.user.delete({
      where: { id, role: "ADMIN" },
    });
    return { message: "Admin deleted successfully" };
  }
  static async getAdminByid(id) {
    if (!id) {
      throw new Error("Invalid user ID");
    }
    const admin = await prisma.user.findFirst({
      where: { id, role: "ADMIN" },
      include: {
        admin: true,
      },
    });
    return admin;
  }
  static async createAdmin(data) {
    return await prisma.user.create({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        role: "ADMIN", // Ensure role is always 'PATIENT'
        telephoneNumber: data.telephoneNumber,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        profilePhoto: data.profilePhoto, // Default to true if not provided
      },
      include: {
        admin: true,
      },
    });
  }
  //admin controller for chat
  static async getAdminChatRooms() {
    const chatRooms = await prisma.chatRoom.findMany({
      include: {
        patient: {
          include: { user: true },
        },
        doctor: {
          include: { user: true },
        },
      },
    });
    return chatRooms;
  }
  //get admin chat room nurse
  static async getAdminChatRoomNurse(id) {
    if (!id) {
      throw new Error("Invalid user ID");
    }
    const chatRoom = await prisma.chatRoomPatientNurse.findMany({
      where: {
        OR: [{ patient: { id } }, { nurse: { id } }],
      },
      include: {
        patient: {
          include: { user: true },
        },
        nurse: {
          include: { user: true },
        },
      },
    });
    return chatRoom;
  }
}
