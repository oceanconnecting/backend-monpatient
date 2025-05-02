// location.services.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const LocationService = {
  // Patient location services
  async createPatientLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    const location = await prisma.location.create({
      data: {
        patientId: id,
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
    return location;
  },
  
  async getPatientLocation(id) {
    return prisma.location.findUnique({
      where: { patientId: id }
    });
  },
  
  async updatePatientLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    return prisma.location.update({
      where: { patientId: id },
      data: {
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
  },

  async deletePatientLocation(id) {
    try {
      await prisma.location.delete({
        where: { patientId: id }
      });
      return { success: true, message: 'Location deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') { // Prisma's "Record not found" error
        return { success: false, message: 'Location not found' };
      }
      throw error; // Re-throw other errors for global error handler
    }
  },

  // Nurse location services
  async createNurseLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    const location = await prisma.location.create({
      data: {
        nurseId: id,
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
    return location;
  },
  
  async getNurseLocation(id) {
    return prisma.location.findUnique({
      where: { nurseId: id },
      include: {
        nurse: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              }
            }
          }
        }
      }
    });
  },
  
  async updateNurseLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    return prisma.location.update({
      where: { nurseId: id },
      data: {
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
  },

  async deleteNurseLocation(id) {
    return prisma.location.delete({
      where: { nurseId: id }
    });
  },

  // Doctor location services
  async createDoctorLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    const location = await prisma.location.create({
      data: {
        doctorId: id,
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
    return location;
  },
  
  async getDoctorLocation(id) {
    return prisma.location.findUnique({
      where: { doctorId: id }
    });
  },
  
  async updateDoctorLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    return prisma.location.update({
      where: { doctorId: id },
      data: {
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
  },

  async deleteDoctorLocation(id) {
    return prisma.location.delete({
      where: { doctorId: id }
    });
  },

  // Pharmacy location services
  async createPharmacyLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    const location = await prisma.location.create({
      data: {
        pharmacyId: id,
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
    return location;
  },
  
  async getPharmacyLocation(id) {
    return prisma.location.findUnique({
      where: { pharmacyId: id }
    });
  },
  
  async updatePharmacyLocation(id, data) {
    const { latitude, longitude, address, details } = data;
    return prisma.location.update({
      where: { pharmacyId: id },
      data: {
        lat: latitude,
        long: longitude,
        address,
        details,
        date: new Date()
      }
    });
  },

  async deletePharmacyLocation(id) {
    return prisma.location.delete({
      where: { pharmacyId: id }
    });
  },

  // Get locations by proximity
  async getLocationsByProximity(latitude, longitude, radiusInKm, role = null) {
    // This is a simplified version. In a real application, you would use
    // a spatial query or a specialized library for geospatial calculations.
    
    // Get all locations first
    const locations = await prisma.location.findMany({
      include: {
        patient: true,
        nurse: true,
        doctor: true,
        pharmacy: true
      }
    });
    
    // Filter by role if specified
    const filteredByRole = role 
      ? locations.filter(loc => {
          if (role === 'patient') return loc.patientId !== null;
          if (role === 'nurse') return loc.nurseId !== null;
          if (role === 'doctor') return loc.doctorId !== null;
          if (role === 'pharmacy') return loc.pharmacyId !== null;
          return true;
        })
      : locations;
    
    // Calculate distance for each location and filter by radius
    return filteredByRole
      .map(loc => {
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(loc.lat),
          parseFloat(loc.long)
        );
        
        return { ...loc, distance };
      })
      .filter(loc => loc.distance <= radiusInKm)
      .sort((a, b) => a.distance - b.distance);
  }
};

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}