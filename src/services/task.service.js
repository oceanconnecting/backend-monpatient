// src/services/taskService.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class TaskService {
  /**
   * Create a new task
   * @param {Object} taskData - Task data including doctorId, nurseId, and details
   * @returns {Promise<Object>} Created task with related records
   */
  async createTask(taskData) {
    try {
      const task = await prisma.task.create({
        data: {
          details: taskData.details,
          doctor: {
            connect: { id: taskData.doctorId }
          },
          nurse: {
            connect: { id: taskData.nurseId }
          },
          status: 'PENDING'
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          }
        }
      });

      // After creating a task, we might want to create a notification
      await prisma.notification.create({
        data: {
          userId: task.nurse.userId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `Dr. ${task.doctor.user.lastname} has assigned you a new task: ${task.details.substring(0, 50)}${task.details.length > 50 ? '...' : ''}`,
          metadata: {
            taskId: task.id,
            doctorId: task.doctorId
          }
        }
      });

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get all tasks
   * @returns {Promise<Array>} List of all tasks
   */
  async getAllTasks() {
    try {
      return await prisma.task.findMany({
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          scheduledTasks: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Error getting all tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks by doctor ID
   * @param {string} doctorId - Doctor ID to filter tasks
   * @returns {Promise<Array>} List of tasks for the doctor
   */
  async getTasksByDoctorId(doctorId) {
    try {
      return await prisma.task.findMany({
        where: {
          doctorId: doctorId
        },
        include: {
          nurse: {
            include: {
              user: true
            }
          },
          scheduledTasks: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error(`Error getting tasks for doctor ID ${doctorId}:`, error);
      throw error;
    }
  }

  /**
   * Get tasks by nurse ID
   * @param {string} nurseId - Nurse ID to filter tasks
   * @returns {Promise<Array>} List of tasks for the nurse
   */
  async getTasksByNurseId(nurseId) {
    try {
      return await prisma.task.findMany({
        where: {
          nurseId: nurseId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          scheduledTasks: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error(`Error getting tasks for nurse ID ${nurseId}:`, error);
      throw error;
    }
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID to find
   * @returns {Promise<Object|null>} Task object or null if not found
   */
  async getTaskById(taskId) {
    try {
      return await prisma.task.findUnique({
        where: {
          id: taskId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          },
          scheduledTasks: true
        }
      });
    } catch (error) {
      console.error(`Error getting task with ID ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task status
   * @param {string} taskId - ID of the task to update
   * @param {string} status - New status value (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
   * @returns {Promise<Object>} Updated task
   */
  async updateTaskStatus(taskId, status) {
    try {
      const updateData = {
        status: status,
      };
      
      // If task is being marked as completed, add completion time
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
      
      const updatedTask = await prisma.task.update({
        where: {
          id: taskId
        },
        data: updateData,
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          }
        }
      });

      // Create a notification for the doctor when a nurse updates the task status
      if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
        const statusText = status === 'IN_PROGRESS' ? 'started working on' : 'completed';
        
        await prisma.notification.create({
          data: {
            userId: updatedTask.doctor.userId,
            type: `TASK_${status}`,
            title: `Task ${statusText}`,
            message: `${updatedTask.nurse.user.firstname} ${updatedTask.nurse.user.lastname} has ${statusText} the task: ${updatedTask.details.substring(0, 50)}${updatedTask.details.length > 50 ? '...' : ''}`,
            metadata: {
              taskId: updatedTask.id,
              nurseId: updatedTask.nurseId
            }
          }
        });
      }

      return updatedTask;
    } catch (error) {
      console.error(`Error updating task status for task ID ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task details
   * @param {string} taskId - ID of the task to update
   * @param {string} details - New task details
   * @returns {Promise<Object>} Updated task
   */
  async updateTaskDetails(taskId, details) {
    try {
      return await prisma.task.update({
        where: {
          id: taskId
        },
        data: {
          details: details
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          nurse: {
            include: {
              user: true
            }
          }
        }
      });
    } catch (error) {
      console.error(`Error updating task details for task ID ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Delete task
   * @param {string} taskId - ID of the task to delete
   * @returns {Promise<Object>} Deleted task
   */
  async deleteTask(taskId) {
    try {
      // First check if there are any scheduled tasks related to this task
      const scheduledTasks = await prisma.schedule.findMany({
        where: {
          taskId: taskId
        }
      });

      // If there are scheduled tasks, update them to remove the taskId reference
      if (scheduledTasks.length > 0) {
        await prisma.schedule.updateMany({
          where: {
            taskId: taskId
          },
          data: {
            taskId: null,
            status: 'CANCELLED'
          }
        });
      }

      // Now delete the task
      return await prisma.task.delete({
        where: {
          id: taskId
        },
        include: {
          doctor: true,
          nurse: true
        }
      });
    } catch (error) {
      console.error(`Error deleting task with ID ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get task statistics
   * @param {string} [doctorId] - Optional doctor ID to filter tasks
   * @param {string} [nurseId] - Optional nurse ID to filter tasks
   * @returns {Promise<Object>} Task statistics
   */
  async getTaskStatistics(doctorId, nurseId) {
    try {
      const whereClause = {};
      
      if (doctorId) {
        whereClause.doctorId = doctorId;
      }
      
      if (nurseId) {
        whereClause.nurseId = nurseId;
      }
      
      const [
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        cancelledTasks
      ] = await Promise.all([
        prisma.task.count({ where: whereClause }),
        prisma.task.count({ where: { ...whereClause, status: 'PENDING' } }),
        prisma.task.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
        prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        prisma.task.count({ where: { ...whereClause, status: 'CANCELLED' } })
      ]);
      
      return {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        cancelledTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting task statistics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const taskService = new TaskService();
export default taskService;