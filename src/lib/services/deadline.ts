import { prisma } from '@/lib/prisma';
import { ApplicationType } from '@/lib/validations/application';

export interface DeadlineAlert {
  id: string;
  applicationId: string;
  universityName: string;
  applicationType: ApplicationType;
  deadline: Date;
  daysUntil: number;
  urgencyLevel: 'critical' | 'warning' | 'info';
  status: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'application_deadline' | 'requirement_deadline';
  applicationId?: string;
  requirementId?: string;
  urgencyLevel: 'critical' | 'warning' | 'info';
  status: string;
}

export class DeadlineService {
  /**
   * Calculate deadline based on application type and university deadlines
   */
  static calculateDeadline(
    applicationType: ApplicationType,
    universityDeadlines: Record<string, string> | null
  ): Date {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Default deadlines if university doesn't specify
    const defaultDeadlines: Record<ApplicationType, string> = {
      'early_decision': `${currentYear}-11-01`, // November 1st
      'early_action': `${currentYear}-11-15`,   // November 15th
      'regular': `${nextYear}-01-15`,           // January 15th next year
      'rolling': `${nextYear}-05-01`            // May 1st next year (rolling has flexible deadline)
    };

    let deadlineStr: string;

    if (universityDeadlines && universityDeadlines[applicationType]) {
      deadlineStr = universityDeadlines[applicationType];
    } else {
      deadlineStr = defaultDeadlines[applicationType];
    }

    const deadline = new Date(deadlineStr);
    
    // If the deadline has passed this year, move to next year
    const now = new Date();
    if (deadline < now && applicationType !== 'rolling') {
      deadline.setFullYear(deadline.getFullYear() + 1);
    }

    return deadline;
  }

  /**
   * Get deadline alerts for a student
   */
  static async getDeadlineAlerts(
    studentId: string,
    daysAhead: number = 30
  ): Promise<DeadlineAlert[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const applications = await prisma.application.findMany({
      where: {
        studentId,
        deadline: {
          lte: cutoffDate
        },
        status: {
          in: ['not_started', 'in_progress']
        }
      },
      include: {
        university: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    const now = new Date();
    
    return applications.map(app => {
      const daysUntil = Math.ceil(
        (app.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgencyLevel: 'critical' | 'warning' | 'info';
      if (daysUntil <= 3) {
        urgencyLevel = 'critical';
      } else if (daysUntil <= 7) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'info';
      }

      return {
        id: app.id,
        applicationId: app.id,
        universityName: app.university.name,
        applicationType: app.applicationType as ApplicationType,
        deadline: app.deadline,
        daysUntil,
        urgencyLevel,
        status: app.status
      };
    });
  }

  /**
   * Get requirement deadline alerts
   */
  static async getRequirementDeadlineAlerts(
    studentId: string,
    daysAhead: number = 30
  ): Promise<DeadlineAlert[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const requirements = await prisma.applicationRequirement.findMany({
      where: {
        deadline: {
          lte: cutoffDate,
          not: null
        },
        status: {
          in: ['not_started', 'in_progress']
        },
        application: {
          studentId
        }
      },
      include: {
        application: {
          include: {
            university: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    const now = new Date();
    
    return requirements.map(req => {
      const daysUntil = Math.ceil(
        (req.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgencyLevel: 'critical' | 'warning' | 'info';
      if (daysUntil <= 3) {
        urgencyLevel = 'critical';
      } else if (daysUntil <= 7) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'info';
      }

      return {
        id: req.id,
        applicationId: req.applicationId,
        universityName: req.application.university.name,
        applicationType: req.application.applicationType as ApplicationType,
        deadline: req.deadline!,
        daysUntil,
        urgencyLevel,
        status: req.status
      };
    });
  }

  /**
   * Get calendar events for deadline visualization
   */
  static async getCalendarEvents(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const [applications, requirements] = await Promise.all([
      // Application deadlines
      prisma.application.findMany({
        where: {
          studentId,
          deadline: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          university: {
            select: {
              name: true
            }
          }
        }
      }),
      // Requirement deadlines
      prisma.applicationRequirement.findMany({
        where: {
          deadline: {
            gte: startDate,
            lte: endDate,
            not: null
          },
          application: {
            studentId
          }
        },
        include: {
          application: {
            include: {
              university: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      })
    ]);

    const events: CalendarEvent[] = [];
    const now = new Date();

    // Add application deadline events
    applications.forEach(app => {
      const daysUntil = Math.ceil(
        (app.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgencyLevel: 'critical' | 'warning' | 'info';
      if (daysUntil <= 3 && (app.status === 'not_started' || app.status === 'in_progress')) {
        urgencyLevel = 'critical';
      } else if (daysUntil <= 7 && (app.status === 'not_started' || app.status === 'in_progress')) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'info';
      }

      events.push({
        id: `app-${app.id}`,
        title: `${app.university.name} Application Due`,
        date: app.deadline,
        type: 'application_deadline',
        applicationId: app.id,
        urgencyLevel,
        status: app.status
      });
    });

    // Add requirement deadline events
    requirements.forEach(req => {
      const daysUntil = Math.ceil(
        (req.deadline!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgencyLevel: 'critical' | 'warning' | 'info';
      if (daysUntil <= 3 && (req.status === 'not_started' || req.status === 'in_progress')) {
        urgencyLevel = 'critical';
      } else if (daysUntil <= 7 && (req.status === 'not_started' || req.status === 'in_progress')) {
        urgencyLevel = 'warning';
      } else {
        urgencyLevel = 'info';
      }

      events.push({
        id: `req-${req.id}`,
        title: `${req.title} - ${req.application.university.name}`,
        date: req.deadline!,
        type: 'requirement_deadline',
        applicationId: req.applicationId,
        requirementId: req.id,
        urgencyLevel,
        status: req.status
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get upcoming deadlines summary
   */
  static async getUpcomingDeadlinesSummary(studentId: string): Promise<{
    critical: number;
    warning: number;
    total: number;
    nextDeadline?: {
      title: string;
      date: Date;
      daysUntil: number;
    };
  }> {
    const alerts = await this.getDeadlineAlerts(studentId, 30);
    const requirementAlerts = await this.getRequirementDeadlineAlerts(studentId, 30);
    
    const allAlerts = [...alerts, ...requirementAlerts];
    
    const critical = allAlerts.filter(alert => alert.urgencyLevel === 'critical').length;
    const warning = allAlerts.filter(alert => alert.urgencyLevel === 'warning').length;
    const total = allAlerts.length;

    let nextDeadline;
    if (allAlerts.length > 0) {
      const next = allAlerts[0]; // Already sorted by deadline
      nextDeadline = {
        title: next.universityName,
        date: next.deadline,
        daysUntil: next.daysUntil
      };
    }

    return {
      critical,
      warning,
      total,
      nextDeadline
    };
  }
}
