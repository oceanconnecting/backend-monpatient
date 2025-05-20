import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const PharmacyMedicinesService = {
  async getPharmacyMedicines(id, { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = {}) {
    // Validate sort parameters
    const validSortFields = ['name', 'price', 'category', 'manufacturer', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id },
      include: {
        medicines: {
          take: limit,
          skip: (page - 1) * limit,
          orderBy: {
            [sortField]: order
          }
        },
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true
          }
        }
      }
    });
    
    // Count total medicines for pagination metadata
    const totalMedicines = await prisma.medicine.count({
      where: { pharmacyId: id }
    });
    
    return {
      ...pharmacy,
      pagination: {
        total: totalMedicines,
        page,
        limit,
        pages: Math.ceil(totalMedicines / limit)
      }
    };
  },
  
  async getAllMedicines({ page = 1, limit = 100, sortBy = 'name', sortOrder = 'asc', filter = {} } = {}) {
    // Validate sort parameters
    const validSortFields = ['name', 'price', 'category', 'manufacturer', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
    const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';
    
    // Build filter conditions
    const where = {};
    
    if (filter.name) {
      where.name = { contains: filter.name, mode: 'insensitive' };
    }
    
    if (filter.category) {
      where.category = { contains: filter.category, mode: 'insensitive' };
    }
    
    if (filter.manufacturer) {
      where.manufacturer = { contains: filter.manufacturer, mode: 'insensitive' };
    }
    
    if (filter.minPrice !== undefined) {
      where.price = { ...where.price, gte: parseFloat(filter.minPrice) };
    }
    
    if (filter.maxPrice !== undefined) {
      where.price = { ...where.price, lte: parseFloat(filter.maxPrice) };
    }
    
    // Fetch medicines with sorting and filtering
    const medicines = await prisma.medicine.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        [sortField]: order
      },
      include: {
        pharmacy: {
          select: {
            name: true,
            phone: true
          }
        }
      }
    });
    
    // Count total medicines for pagination metadata
    const totalMedicines = await prisma.medicine.count({ where });
    
    return {
      data: medicines,
      pagination: {
        total: totalMedicines,
        page,
        limit,
        pages: Math.ceil(totalMedicines / limit)
      }
    };
  },
  
  async createMedicines(pharmacyId, medicinesArray) {
    const result = await prisma.medicine.createMany({
      data: medicinesArray.map(medicine => ({
        ...medicine,
        pharmacyId
      }))
    });
    
    return {
      count: result.count,
      success: true
    };
  },
  
  async updateMedicine(medicineId, medicineData) {
    // First check if medicine exists
    const existingMedicine = await prisma.medicine.findMany({
      where: { id: medicineId }
    });
    
    if (!existingMedicine) {
      throw new Error('Medicine not found');
    }
    
    return await prisma.medicine.update({
      where: { id: medicineId },
      data: medicineData
    });
  },
  
  async deleteMedicine(id) {
    const medicine = await prisma.medicine.findUnique({
      where: { id }
    });
    
    if (!medicine) {
      throw new Error('Medicine not found');
    }
    
    return await prisma.medicine.delete({ where: { id } });
  },
  
  async getMedicineById(id) {
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        pharmacy: {
          select: {
            pharmacyName:true,
          
            pharmacyLicenseNumber:true
          
          }
        }
      }
    });
    
    if (!medicine) {
      throw new Error('Medicine not found');
    }
    
    return medicine;
  },
  
  async searchMedicines(searchTerm, { page = 1, limit = 20 } = {}) {
    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { category: { contains: searchTerm, mode: 'insensitive' } },
          { manufacturer: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        pharmacy: {
          select: {
            name: true,
          }
        }
      }
    });
    
    const totalResults = await prisma.medicine.count({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { category: { contains: searchTerm, mode: 'insensitive' } },
          { manufacturer: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }
    });
    
    return {
      data: medicines,
      pagination: {
        total: totalResults,
        page,
        limit,
        pages: Math.ceil(totalResults / limit)
      }
    };
  },
  
  async getPharmacyDashboardStats(pharmacyId){
     try{
     const medicines=await prisma.medicine.count({
      where:{
        pharmacyId
      }
     })
     const prescriptions=await prisma.prescription.count({
      where:{
        pharmacyId
      }
     })
     const orders=await prisma.order.count({
      where:{
        pharmacyId
      }
     })
     return{
      medicines,
      prescriptions,
      orders
     }
     }
     
     catch(err){
  console.log(`error:${err}`)
     }
  }
};