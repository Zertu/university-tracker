import { PrismaClient } from '@prisma/client';
import { notificationService } from './notification';

const prisma = new PrismaClient();

class NotificationScheduler {
  /**
   * Check for upcoming deadlines and send reminder notifications
   */
  async processDeadlineReminders() {
    try {
      console.log('Processing deadline reminders...');
      
      // Get all users with their notification preferences
      const users = await prisma.user.findMany({
        include: {
          applications: {
            include: {
              university: true,
              requirements: true,
            },
          },
        },
      });

      const notifications = [];

      for (const user of users) {
        const preferences = await notificationService.getUserPreferences(user.id);
        
        if (!preferences.deadlineReminders) {
          continue; // Skip if user has disabled deadline reminders
        }

        // Check application deadlines
        for (const application of user.applications) {
          const daysUntilDeadline = Math.ceil(
            (application.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          // Send reminder if deadline is within the user's preferred reminder window
          if (daysUntilDeadline === preferences.reminderDaysBefore && daysUntilDeadline > 0) {
            // Check if we've already sent a reminder for this deadline
            const existingNotification = await prisma.notification.findFirst({
              where: {
                userId: user.id,
                type: 'deadline_reminder',
                message: {
                  contains: application.university.name,
                },
                createdAt: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
                },
              },
            });

            if (!existingNotification) {
              notifications.push({
                userId: user.id,
                type: 'deadline_reminder' as const,
                title: 'Application Deadline Approaching',
                message: `Your application to ${application.university.name} is due in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} (${application.deadline.toLocaleDateString()})`,
                metadata: { 
                  applicationId: application.id,
                  deadline: application.deadline.toISOString(),
                  universityName: application.university.name,
                },
              });
            }
          }

          // Check requirement deadlines
          for (const requirement of application.requirements) {
            if (!requirement.deadline || requirement.status === 'completed') {
              continue;
            }

            const daysUntilRequirementDeadline = Math.ceil(
              (requirement.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilRequirementDeadline === preferences.reminderDaysBefore && daysUntilRequirementDeadline > 0) {
              // Check if we've already sent a reminder for this requirement
              const existingRequirementNotification = await prisma.notification.findFirst({
                where: {
                  userId: user.id,
                  type: 'requirement_due',
                  message: {
                    contains: requirement.title,
                  },
                  createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              });

              if (!existingRequirementNotification) {
                notifications.push({
                  userId: user.id,
                  type: 'requirement_due' as const,
                  title: 'Requirement Due Soon',
                  message: `"${requirement.title}" for ${application.university.name} is due in ${daysUntilRequirementDeadline} day${daysUntilRequirementDeadline !== 1 ? 's' : ''} (${requirement.deadline.toLocaleDateString()})`,
                  metadata: { 
                    requirementId: requirement.id,
                    applicationId: application.id,
                    deadline: requirement.deadline.toISOString(),
                    universityName: application.university.name,
                  },
                });
              }
            }
          }
        }
      }

      // Batch create all notifications
      if (notifications.length > 0) {
        await notificationService.batchCreateNotifications(notifications);
        console.log(`Created ${notifications.length} deadline reminder notifications`);
      } else {
        console.log('No deadline reminders to send');
      }

      return notifications.length;
    } catch (error) {
      console.error('Error processing deadline reminders:', error);
      throw new Error('Failed to process deadline reminders');
    }
  }

  /**
   * Process overdue deadlines and send urgent notifications
   */
  async processOverdueDeadlines() {
    try {
      console.log('Processing overdue deadline notifications...');
      
      const users = await prisma.user.findMany({
        include: {
          applications: {
            include: {
              university: true,
              requirements: true,
            },
            where: {
              status: {
                in: ['not_started', 'in_progress'],
              },
              deadline: {
                lt: new Date(), // Past deadline
              },
            },
          },
        },
      });

      const notifications = [];

      for (const user of users) {
        const preferences = await notificationService.getUserPreferences(user.id);
        
        if (!preferences.deadlineReminders) {
          continue;
        }

        for (const application of user.applications) {
          const daysOverdue = Math.ceil(
            (Date.now() - application.deadline.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Send overdue notification only once per day
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: user.id,
              type: 'deadline_reminder',
              message: {
                contains: application.university.name,
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          });

          if (!existingNotification) {
            notifications.push({
              userId: user.id,
              type: 'deadline_reminder' as const,
              title: 'Application Deadline Overdue',
              message: `Your application to ${application.university.name} is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue (was due ${application.deadline.toLocaleDateString()})`,
              metadata: { 
                applicationId: application.id,
                deadline: application.deadline.toISOString(),
                universityName: application.university.name,
                overdue: true,
                daysOverdue,
              },
            });
          }
        }
      }

      if (notifications.length > 0) {
        await notificationService.batchCreateNotifications(notifications);
        console.log(`Created ${notifications.length} overdue deadline notifications`);
      }

      return notifications.length;
    } catch (error) {
      console.error('Error processing overdue deadlines:', error);
      throw new Error('Failed to process overdue deadlines');
    }
  }

  /**
   * Send notification when application status changes
   */
  async sendStatusChangeNotification(
    applicationId: string,
    fromStatus: string,
    toStatus: string,
    changedBy: string
  ) {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          university: true,
          student: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const preferences = await notificationService.getUserPreferences(application.studentId);
      
      if (!preferences.statusUpdates) {
        return; // Skip if user has disabled status updates
      }

      // Don't send notification if the student made the change themselves
      if (changedBy === application.studentId) {
        return;
      }

      await notificationService.createStatusChangeNotification(
        application.studentId,
        applicationId,
        application.university.name,
        fromStatus,
        toStatus
      );

      // Also notify parents if they exist
      const parentLinks = await prisma.parentChildLink.findMany({
        where: { childId: application.studentId },
        include: { parent: true },
      });

      for (const link of parentLinks) {
        const parentPreferences = await notificationService.getUserPreferences(link.parentId);
        
        if (parentPreferences.statusUpdates) {
          await notificationService.createNotification({
            userId: link.parentId,
            type: 'status_update',
            title: `${application.student.name}'s Application Status Updated`,
            message: `${application.student.name}'s application to ${application.university.name} status changed from "${this.formatStatus(fromStatus)}" to "${this.formatStatus(toStatus)}"`,
            metadata: { 
              applicationId,
              studentId: application.studentId,
              fromStatus,
              toStatus,
              universityName: application.university.name,
            },
          });
        }
      }

      console.log(`Sent status change notification for application ${applicationId}`);
    } catch (error) {
      console.error('Error sending status change notification:', error);
      throw new Error('Failed to send status change notification');
    }
  }

  /**
   * Send notification when a decision is received
   */
  async sendDecisionNotification(
    applicationId: string,
    decisionType: string,
    decisionDate: Date
  ) {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          university: true,
          student: true,
        },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const preferences = await notificationService.getUserPreferences(application.studentId);
      
      if (!preferences.decisionAlerts) {
        return;
      }

      const decisionEmoji = this.getDecisionEmoji(decisionType);
      const decisionText = this.formatDecisionType(decisionType);

      await notificationService.createNotification({
        userId: application.studentId,
        type: 'decision_received',
        title: `${decisionEmoji} Decision Received`,
        message: `You have been ${decisionText} to ${application.university.name}!`,
        metadata: { 
          applicationId,
          decisionType,
          decisionDate: decisionDate.toISOString(),
          universityName: application.university.name,
        },
      });

      // Notify parents
      const parentLinks = await prisma.parentChildLink.findMany({
        where: { childId: application.studentId },
        include: { parent: true },
      });

      for (const link of parentLinks) {
        const parentPreferences = await notificationService.getUserPreferences(link.parentId);
        
        if (parentPreferences.decisionAlerts) {
          await notificationService.createNotification({
            userId: link.parentId,
            type: 'decision_received',
            title: `${decisionEmoji} ${application.student.name}'s Decision Received`,
            message: `${application.student.name} has been ${decisionText} to ${application.university.name}!`,
            metadata: { 
              applicationId,
              studentId: application.studentId,
              decisionType,
              decisionDate: decisionDate.toISOString(),
              universityName: application.university.name,
            },
          });
        }
      }

      console.log(`Sent decision notification for application ${applicationId}`);
    } catch (error) {
      console.error('Error sending decision notification:', error);
      throw new Error('Failed to send decision notification');
    }
  }

  /**
   * Run all scheduled notification processes
   */
  async runScheduledTasks() {
    try {
      console.log('Running scheduled notification tasks...');
      
      const deadlineReminders = await this.processDeadlineReminders();
      const overdueNotifications = await this.processOverdueDeadlines();
      
      console.log(`Scheduled tasks completed: ${deadlineReminders} deadline reminders, ${overdueNotifications} overdue notifications`);
      
      return {
        deadlineReminders,
        overdueNotifications,
      };
    } catch (error) {
      console.error('Error running scheduled notification tasks:', error);
      throw new Error('Failed to run scheduled notification tasks');
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupNotifications() {
    try {
      const cleanedCount = await notificationService.cleanupOldNotifications();
      console.log(`Cleaned up ${cleanedCount} old notifications`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw new Error('Failed to cleanup notifications');
    }
  }

  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'not_started': 'Not Started',
      'in_progress': 'In Progress',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'decided': 'Decision Received',
    };
    return statusMap[status] || status;
  }

  private formatDecisionType(decisionType: string): string {
    const decisionMap: Record<string, string> = {
      'accepted': 'accepted',
      'rejected': 'rejected',
      'waitlisted': 'waitlisted',
    };
    return decisionMap[decisionType] || decisionType;
  }

  private getDecisionEmoji(decisionType: string): string {
    const emojiMap: Record<string, string> = {
      'accepted': '🎉',
      'rejected': '💔',
      'waitlisted': '⏳',
    };
    return emojiMap[decisionType] || '📧';
  }
}

export const notificationScheduler = new NotificationScheduler();
