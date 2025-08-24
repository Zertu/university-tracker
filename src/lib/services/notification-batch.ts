import { PrismaClient } from '@prisma/client';
import { notificationService, CreateNotificationData } from './notification';

const prisma = new PrismaClient();

interface BatchNotificationJob {
  id: string;
  notifications: CreateNotificationData[];
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

export class NotificationBatchService {
  private static batchQueue: Map<string, BatchNotificationJob> = new Map();
  private static isProcessing = false;

  /**
   * Add notifications to batch queue
   */
  static async addToBatch(notifications: CreateNotificationData[], scheduledFor?: Date) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BatchNotificationJob = {
      id: batchId,
      notifications,
      scheduledFor: scheduledFor || new Date(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.batchQueue.set(batchId, job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processBatchQueue();
    }

    return batchId;
  }

  /**
   * Process the batch queue
   */
  private static async processBatchQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    try {
      while (this.batchQueue.size > 0) {
        const now = new Date();
        const readyJobs = Array.from(this.batchQueue.values())
          .filter(job => job.status === 'pending' && job.scheduledFor <= now)
          .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());

        if (readyJobs.length === 0) {
          // No jobs ready to process, wait a bit
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        for (const job of readyJobs) {
          await this.processBatchJob(job);
        }
      }
    } catch (error) {
      console.error('Error processing batch queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single batch job
   */
  private static async processBatchJob(job: BatchNotificationJob) {
    try {
      job.status = 'processing';
      job.processedAt = new Date();

      console.log(`Processing batch job ${job.id} with ${job.notifications.length} notifications`);

      // Group notifications by user for better batching
      const notificationsByUser = this.groupNotificationsByUser(job.notifications);
      
      // Process notifications in smaller chunks to avoid overwhelming the system
      const chunkSize = 50;
      const chunks = this.chunkArray(job.notifications, chunkSize);

      for (const chunk of chunks) {
        await notificationService.batchCreateNotifications(chunk);
        
        // Small delay between chunks to prevent overwhelming the system
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      job.status = 'completed';
      console.log(`Completed batch job ${job.id}`);
      
      // Remove completed job from queue after a delay
      setTimeout(() => {
        this.batchQueue.delete(job.id);
      }, 60000); // Keep for 1 minute for debugging

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to process batch job ${job.id}:`, error);
      
      // Remove failed job from queue after a delay
      setTimeout(() => {
        this.batchQueue.delete(job.id);
      }, 300000); // Keep for 5 minutes for debugging
    }
  }

  /**
   * Group notifications by user ID
   */
  private static groupNotificationsByUser(notifications: CreateNotificationData[]) {
    return notifications.reduce((groups, notification) => {
      const userId = notification.userId;
      if (!groups[userId]) {
        groups[userId] = [];
      }
      groups[userId].push(notification);
      return groups;
    }, {} as Record<string, CreateNotificationData[]>);
  }

  /**
   * Split array into chunks
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get batch job status
   */
  static getBatchStatus(batchId: string): BatchNotificationJob | null {
    return this.batchQueue.get(batchId) || null;
  }

  /**
   * Get queue statistics
   */
  static getQueueStats() {
    const jobs = Array.from(this.batchQueue.values());
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      totalNotifications: jobs.reduce((sum, job) => sum + job.notifications.length, 0),
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Schedule daily digest notifications
   */
  static async scheduleDailyDigest(userId: string, scheduledFor: Date) {
    try {
      // Get user's recent activity for digest
      const [applications, recentNotifications] = await Promise.all([
        prisma.application.findMany({
          where: { studentId: userId },
          include: {
            university: true,
            requirements: {
              where: {
                deadline: {
                  gte: new Date(),
                  lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
                },
              },
            },
          },
        }),
        prisma.notification.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      const upcomingDeadlines = applications.flatMap(app => 
        app.requirements.map(req => ({
          university: app.university.name,
          requirement: req.title,
          deadline: req.deadline,
        }))
      );

      if (upcomingDeadlines.length > 0 || recentNotifications > 0) {
        const digestNotification: CreateNotificationData = {
          userId,
          type: 'deadline_reminder',
          title: 'Daily Application Digest',
          message: `You have ${upcomingDeadlines.length} upcoming deadlines and ${recentNotifications} new notifications from the past day.`,
          metadata: {
            type: 'daily_digest',
            upcomingDeadlines: upcomingDeadlines.length,
            recentNotifications,
          },
          scheduledFor,
        };

        return this.addToBatch([digestNotification], scheduledFor);
      }

      return null;
    } catch (error) {
      console.error('Error scheduling daily digest:', error);
      throw new Error('Failed to schedule daily digest');
    }
  }

  /**
   * Schedule weekly summary notifications
   */
  static async scheduleWeeklySummary(userId: string, scheduledFor: Date) {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const [statusChanges, newNotifications, completedRequirements] = await Promise.all([
        prisma.applicationStatusHistory.count({
          where: {
            application: { studentId: userId },
            createdAt: { gte: weekAgo },
          },
        }),
        prisma.notification.count({
          where: {
            userId,
            createdAt: { gte: weekAgo },
          },
        }),
        prisma.applicationRequirement.count({
          where: {
            application: { studentId: userId },
            status: 'completed',
            updatedAt: { gte: weekAgo },
          },
        }),
      ]);

      if (statusChanges > 0 || newNotifications > 0 || completedRequirements > 0) {
        const summaryNotification: CreateNotificationData = {
          userId,
          type: 'status_update',
          title: 'Weekly Application Summary',
          message: `This week: ${statusChanges} status changes, ${completedRequirements} requirements completed, ${newNotifications} total notifications.`,
          metadata: {
            type: 'weekly_summary',
            statusChanges,
            completedRequirements,
            newNotifications,
          },
          scheduledFor,
        };

        return this.addToBatch([summaryNotification], scheduledFor);
      }

      return null;
    } catch (error) {
      console.error('Error scheduling weekly summary:', error);
      throw new Error('Failed to schedule weekly summary');
    }
  }
}

export const notificationBatchService = NotificationBatchService;
