import { prisma } from '@/lib/prisma';
import { ApplicationStatus } from '@/lib/validations/application';
import { Prisma } from '@prisma/client';
import { notificationScheduler } from './notification-scheduler';

export type ApplicationStatusHistoryWithUser = Prisma.ApplicationStatusHistoryGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export class ApplicationStatusService {
  // Record a status change in history
  static async recordStatusChange(
    applicationId: string,
    fromStatus: ApplicationStatus | null,
    toStatus: ApplicationStatus,
    changedBy: string,
    notes?: string
  ): Promise<ApplicationStatusHistoryWithUser> {
    const statusHistory = await prisma.applicationStatusHistory.create({
      data: {
        applicationId,
        fromStatus,
        toStatus,
        changedBy,
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send notification for status change (async, don't wait)
    if (fromStatus && fromStatus !== toStatus) {
      notificationScheduler.sendStatusChangeNotification(
        applicationId,
        fromStatus,
        toStatus,
        changedBy
      ).catch(error => {
        console.error('Failed to send status change notification:', error);
      });
    }

    return statusHistory;
  }

  // Get status history for an application
  static async getStatusHistory(
    applicationId: string
  ): Promise<ApplicationStatusHistoryWithUser[]> {
    return await prisma.applicationStatusHistory.findMany({
      where: {
        applicationId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Get recent status changes across all applications for a student
  static async getRecentStatusChanges(
    studentId: string,
    limit: number = 10
  ): Promise<(ApplicationStatusHistoryWithUser & {
    application: {
      id: string;
      university: {
        name: string;
      };
    };
  })[]> {
    return await prisma.applicationStatusHistory.findMany({
      where: {
        application: {
          studentId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        application: {
          select: {
            id: true,
            university: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  // Validate status transitions
  static validateStatusTransition(
    currentStatus: ApplicationStatus,
    newStatus: ApplicationStatus
  ): { valid: boolean; error?: string } {
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      'not_started': ['in_progress'],
      'in_progress': ['submitted', 'not_started'],
      'submitted': ['under_review', 'in_progress'], // Allow going back to in_progress if needed
      'under_review': ['decided', 'submitted'], // Allow going back to submitted if needed
      'decided': [] // No transitions from decided (final state)
    };

    const allowedTransitions = validTransitions[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`
      };
    }

    return { valid: true };
  }

  // Get status transition suggestions
  static getNextPossibleStatuses(currentStatus: ApplicationStatus): ApplicationStatus[] {
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      'not_started': ['in_progress'],
      'in_progress': ['submitted', 'not_started'],
      'submitted': ['under_review', 'in_progress'],
      'under_review': ['decided', 'submitted'],
      'decided': []
    };

    return validTransitions[currentStatus] || [];
  }

  // Get status display information
  static getStatusInfo(status: ApplicationStatus): {
    label: string;
    color: string;
    description: string;
    icon: string;
  } {
    const statusInfo = {
      'not_started': {
        label: 'Not Started',
        color: 'gray',
        description: 'Application has been created but work has not begun',
        icon: 'circle'
      },
      'in_progress': {
        label: 'In Progress',
        color: 'blue',
        description: 'Currently working on application requirements',
        icon: 'clock'
      },
      'submitted': {
        label: 'Submitted',
        color: 'green',
        description: 'Application has been submitted to the university',
        icon: 'check'
      },
      'under_review': {
        label: 'Under Review',
        color: 'yellow',
        description: 'University is reviewing the application',
        icon: 'eye'
      },
      'decided': {
        label: 'Decision Received',
        color: 'purple',
        description: 'University has made a decision on the application',
        icon: 'flag'
      }
    };

    return statusInfo[status];
  }

  // Automatically transition status based on requirements completion
  static async checkAutoStatusTransition(
    applicationId: string,
    userId: string
  ): Promise<{ transitioned: boolean; newStatus?: ApplicationStatus }> {
    // Get application with requirements
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        requirements: true
      }
    });

    if (!application) {
      return { transitioned: false };
    }

    const currentStatus = application.status as ApplicationStatus;
    
    // Only auto-transition from not_started to in_progress
    if (currentStatus === 'not_started') {
      const hasStartedRequirements = application.requirements.some(
        req => req.status === 'in_progress' || req.status === 'completed'
      );

      if (hasStartedRequirements) {
        // Update application status
        await prisma.application.update({
          where: { id: applicationId },
          data: { status: 'in_progress' }
        });

        // Record status change
        await this.recordStatusChange(
          applicationId,
          'not_started',
          'in_progress',
          userId,
          'Automatically transitioned when requirements were started'
        );

        return { transitioned: true, newStatus: 'in_progress' };
      }
    }

    return { transitioned: false };
  }

  // Get status statistics for a student
  static async getStatusStatistics(studentId: string): Promise<{
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    recentChanges: number;
  }> {
    const [applications, recentChanges] = await Promise.all([
      prisma.application.findMany({
        where: { studentId },
        select: { status: true }
      }),
      prisma.applicationStatusHistory.count({
        where: {
          application: { studentId },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const total = applications.length;
    const byStatus = applications.reduce((acc, app) => {
      const status = app.status as ApplicationStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    return {
      total,
      byStatus,
      recentChanges
    };
  }
}