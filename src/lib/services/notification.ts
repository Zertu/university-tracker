import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  deadlineReminders: boolean;
  statusUpdates: boolean;
  decisionAlerts: boolean;
  reminderDaysBefore: number; // Days before deadline to send reminder
}

export interface CreateNotificationData {
  userId: string;
  type: 'deadline_reminder' | 'status_update' | 'decision_received' | 'requirement_due';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

export interface NotificationDeliveryResult {
  success: boolean;
  channel: 'database' | 'email' | 'push';
  error?: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          read: false,
        },
      });

      // Deliver notification through available channels
      await this.deliverNotification(notification.id);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      const where: any = { userId };
      
      if (options?.unreadOnly) {
        where.read = false;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: userId,
        },
        data: {
          read: true,
        },
      });

      return notification.count > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId: userId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId: userId,
        },
      });

      return result.count > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId: userId,
          read: false,
        },
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw new Error('Failed to get unread count');
    }
  }

  /**
   * Get user notification preferences (with defaults)
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // For now, return default preferences
    // In a full implementation, this would be stored in the database
    return {
      emailEnabled: true,
      pushEnabled: true,
      deadlineReminders: true,
      statusUpdates: true,
      decisionAlerts: true,
      reminderDaysBefore: 7,
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>) {
    // For now, this is a placeholder
    // In a full implementation, this would update preferences in the database
    console.log(`Updating preferences for user ${userId}:`, preferences);
    return this.getUserPreferences(userId);
  }

  /**
   * Deliver notification through available channels
   */
  private async deliverNotification(notificationId: string): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];

    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: true },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      const preferences = await this.getUserPreferences(notification.userId);

      // Database delivery (always successful since notification is already created)
      results.push({
        success: true,
        channel: 'database',
      });

      // Email delivery
      if (preferences.emailEnabled) {
        const emailResult = await this.deliverEmail(notification);
        results.push(emailResult);
      }

      // Push notification delivery
      if (preferences.pushEnabled) {
        const pushResult = await this.deliverPush(notification);
        results.push(pushResult);
      }

      return results;
    } catch (error) {
      console.error('Error delivering notification:', error);
      return [{
        success: false,
        channel: 'database',
        error: error instanceof Error ? error.message : 'Unknown error',
      }];
    }
  }

  /**
   * Deliver notification via email
   */
  private async deliverEmail(notification: any): Promise<NotificationDeliveryResult> {
    try {
      // Placeholder for email delivery
      // In a full implementation, this would integrate with an email service
      console.log(`Sending email notification to ${notification.user.email}:`, {
        title: notification.title,
        message: notification.message,
      });

      return {
        success: true,
        channel: 'email',
      };
    } catch (error) {
      return {
        success: false,
        channel: 'email',
        error: error instanceof Error ? error.message : 'Email delivery failed',
      };
    }
  }

  /**
   * Deliver notification via push
   */
  private async deliverPush(notification: any): Promise<NotificationDeliveryResult> {
    try {
      // Placeholder for push notification delivery
      // In a full implementation, this would integrate with a push service
      console.log(`Sending push notification to user ${notification.userId}:`, {
        title: notification.title,
        message: notification.message,
      });

      return {
        success: true,
        channel: 'push',
      };
    } catch (error) {
      return {
        success: false,
        channel: 'push',
        error: error instanceof Error ? error.message : 'Push delivery failed',
      };
    }
  }

  /**
   * Create deadline reminder notification
   */
  async createDeadlineReminder(userId: string, applicationId: string, deadline: Date, universityName: string) {
    const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return this.createNotification({
      userId,
      type: 'deadline_reminder',
      title: `Application Deadline Approaching`,
      message: `Your application to ${universityName} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${deadline.toLocaleDateString()})`,
      metadata: { applicationId, deadline: deadline.toISOString() },
    });
  }

  /**
   * Create status change notification
   */
  async createStatusChangeNotification(userId: string, applicationId: string, universityName: string, fromStatus: string, toStatus: string) {
    const statusMessages: Record<string, string> = {
      'not_started': 'Not Started',
      'in_progress': 'In Progress',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'decided': 'Decision Received',
    };

    return this.createNotification({
      userId,
      type: 'status_update',
      title: `Application Status Updated`,
      message: `Your application to ${universityName} status changed from "${statusMessages[fromStatus] || fromStatus}" to "${statusMessages[toStatus] || toStatus}"`,
      metadata: { applicationId, fromStatus, toStatus },
    });
  }

  /**
   * Create requirement due notification
   */
  async createRequirementDueNotification(userId: string, requirementId: string, requirementTitle: string, universityName: string, deadline: Date) {
    const daysUntil = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return this.createNotification({
      userId,
      type: 'requirement_due',
      title: `Requirement Due Soon`,
      message: `"${requirementTitle}" for ${universityName} is due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} (${deadline.toLocaleDateString()})`,
      metadata: { requirementId, deadline: deadline.toISOString() },
    });
  }

  /**
   * Batch create multiple notifications
   */
  async batchCreateNotifications(notifications: CreateNotificationData[]) {
    try {
      const results = [];
      
      for (const notificationData of notifications) {
        const notification = await this.createNotification(notificationData);
        results.push(notification);
      }

      return results;
    } catch (error) {
      console.error('Error batch creating notifications:', error);
      throw new Error('Failed to batch create notifications');
    }
  }

  /**
   * Clean up old read notifications (older than 30 days)
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notification.deleteMany({
        where: {
          read: true,
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw new Error('Failed to cleanup old notifications');
    }
  }
}

export const notificationService = new NotificationService();