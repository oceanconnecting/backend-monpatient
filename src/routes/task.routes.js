// src/routes/taskRoutes.js
import taskService from '../services/task.service.js';
import { checkRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';
/**
 * Task routes plugin
 * @param {FastifyInstance} fastify - Fastify instance
 * @param {Object} options - Plugin options
 */
export default async function taskRoutes(fastify, options) {
  // Input schema for creating a task
  const createTaskSchema = {
    body: {
      type: 'object',
      required: ['doctorId', 'nurseId', 'details'],
      properties: {
        doctorId: { type: 'string' },
        nurseId: { type: 'string' },
        details: { type: 'string' }
      }
    },
    response: {
      201: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { type: 'object' }
        }
      }
    }
  };

  // Input schema for updating task status
  const updateStatusSchema = {
    body: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
      }
    },
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { type: 'object' }
        }
      }
    }
  };

  // Input schema for updating task details
  const updateDetailsSchema = {
    body: {
      type: 'object',
      required: ['details'],
      properties: {
        details: { type: 'string' }
      }
    },
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { type: 'object' }
        }
      }
    }
  };

  // Schema for getting a task by ID
  const getTaskByIdSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          task: { type: 'object' }
        }
      }
    }
  };

  // Schema for deleting a task
  const deleteTaskSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      }
    }
  };

  // Schema for getting task statistics
  const taskStatisticsSchema = {
    querystring: {
      type: 'object',
      properties: {
        doctorId: { type: 'string' },
        nurseId: { type: 'string' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          statistics: { 
            type: 'object',
            properties: {
              totalTasks: { type: 'number' },
              pendingTasks: { type: 'number' },
              inProgressTasks: { type: 'number' },
              completedTasks: { type: 'number' },
              cancelledTasks: { type: 'number' },
              completionRate: { type: 'number' }
            }
          }
        }
      }
    }
  };

  // Create a new task (doctors only)
  fastify.post('/tasks', {
    schema: createTaskSchema,
    preHandler: checkRole(["DOCTOR", "ADMIN"])
  }, async (request, reply) => {
    try {
      const taskData = request.body;
      const task = await taskService.createTask(taskData);
      
      return reply.status(201).send({
        success: true,
        task
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to create task',
        error: error.message
      });
    }
  });

  // Get all tasks (admin only)
  fastify.get('/tasks', {
    preHandler: checkRole(["ADMIN"])
  }, async (request, reply) => {
    try {
      const tasks = await taskService.getAllTasks();
      
      return {
        success: true,
        tasks
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve tasks',
        error: error.message
      });
    }
  });

  // Get tasks by doctor ID
  fastify.get('/tasks/doctor/:doctorId', {
    preHandler: checkRole(["DOCTOR", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { doctorId } = request.params;
      
      // If user is a doctor, ensure they can only see their own tasks
      if (request.user.role === Role.DOCTOR && request.user.doctor.id !== doctorId) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to access other doctor\'s tasks'
        });
      }
      
      const tasks = await taskService.getTasksByDoctorId(doctorId);
      
      return {
        success: true,
        tasks
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve doctor tasks',
        error: error.message
      });
    }
  });

  // Get tasks by nurse ID
  fastify.get('/tasks/nurse/:nurseId', {
    preHandler: checkRole(["NURSE", "DOCTOR", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { nurseId } = request.params;
      
      // If user is a nurse, ensure they can only see their own tasks
      if (request.user.role === Role.NURSE && request.user.nurse.id !== nurseId) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to access other nurse\'s tasks'
        });
      }
      
      const tasks = await taskService.getTasksByNurseId(nurseId);
      
      return {
        success: true,
        tasks
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve nurse tasks',
        error: error.message
      });
    }
  });

  // Get task by ID
  fastify.get('/tasks/:id', {
    schema: getTaskByIdSchema,
    preHandler: checkRole(["DOCTOR", "NURSE", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const task = await taskService.getTaskById(id);
      
      if (!task) {
        return reply.status(404).send({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Check authorization
      if (
        (request.user.role === Role.DOCTOR && request.user.doctor.id !== task.doctorId) &&
        (request.user.role === Role.NURSE && request.user.nurse.id !== task.nurseId)
      ) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to access this task'
        });
      }
      
      return {
        success: true,
        task
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve task',
        error: error.message
      });
    }
  });

  // Update task status
  fastify.patch('/tasks/:id/status', {
    schema: updateStatusSchema,
    preHandler: checkRole(["DOCTOR", "NURSE", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      
      // Verify the task exists
      const task = await taskService.getTaskById(id);
      if (!task) {
        return reply.status(404).send({
          success: false,
          message: 'Task not found'
        });
      }
      
      // Check authorization
      if (
        (request.user.role === Role.DOCTOR && request.user.doctor.id !== task.doctorId) &&
        (request.user.role === Role.NURSE && request.user.nurse.id !== task.nurseId)
      ) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to update this task'
        });
      }
      
      // Additional checks:
      // 1. Only doctors can cancel tasks
      if (status === 'CANCELLED' && request.user.role === Role.NURSE) {
        return reply.status(403).send({
          success: false,
          message: 'Only doctors can cancel tasks'
        });
      }
      
      // 2. Normal status progression for nurses
      if (
        request.user.role === Role.NURSE && 
        ((task.status === 'PENDING' && status !== 'IN_PROGRESS') ||
         (task.status === 'IN_PROGRESS' && status !== 'COMPLETED'))
      ) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid status transition'
        });
      }
      
      const updatedTask = await taskService.updateTaskStatus(id, status);
      
      return {
        success: true,
        task: updatedTask
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update task status',
        error: error.message
      });
    }
  });

  // Update task details (doctors only)
  fastify.patch('/tasks/:id/details', {
    schema: updateDetailsSchema,
    preHandler: checkRole(["DOCTOR", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { details } = request.body;
      
      // Verify the task exists
      const task = await taskService.getTaskById(id);
      if (!task) {
        return reply.status(404).send({
          success: false,
          message: 'Task not found'
        });
      }
      
      // If user is a doctor, ensure they can only update their own tasks
      if (request.user.role === Role.DOCTOR && request.user.doctor.id !== task.doctorId) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to update this task'
        });
      }
      
      const updatedTask = await taskService.updateTaskDetails(id, details);
      
      return {
        success: true,
        task: updatedTask
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update task details',
        error: error.message
      });
    }
  });

  // Delete task (doctors and admins only)
  fastify.delete('/tasks/:id', {
    schema: deleteTaskSchema,
    preHandler: checkRole(["DOCTOR", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      
      // Verify the task exists
      const task = await taskService.getTaskById(id);
      if (!task) {
        return reply.status(404).send({
          success: false,
          message: 'Task not found'
        });
      }
      
      // If user is a doctor, ensure they can only delete their own tasks
      if (request.user.role === Role.DOCTOR && request.user.doctor.id !== task.doctorId) {
        return reply.status(403).send({
          success: false,
          message: 'Unauthorized to delete this task'
        });
      }
      
      await taskService.deleteTask(id);
      
      return {
        success: true,
        message: 'Task deleted successfully'
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to delete task',
        error: error.message
      });
    }
  });

  // Get task statistics
  fastify.get('/tasks/statistics', {
    schema: taskStatisticsSchema,
    preHandler: checkRole(["DOCTOR", "NURSE", "ADMIN"])
  }, async (request, reply) => {
    try {
      const { doctorId, nurseId } = request.query;
      
      // Access control for statistics
     
      
      const statistics = await taskService.getTaskStatistics(doctorId, nurseId);
      
      return {
        success: true,
        statistics
      };
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve task statistics',
        error: error.message
      });
    }
  });
}