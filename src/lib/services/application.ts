import { prisma } from '@/lib/prisma';
import { 
  CreateApplicationInput, 
  UpdateApplicationInput,
  CreateApplicationRequirementInput,
  UpdateApplicationRequirementInput,
  ApplicationQueryInput,
  ApplicationStatus
} from '@/lib/validations/application';
import { ApplicationStatusService } from './application-status';
import { DeadlineService } from './deadline';
import { notificationScheduler } from './notification-scheduler';
import { Prisma } from '@prisma/client';

// Type for application with relations
export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: {
    university: true;
    requirements: true;
    statusHistory: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
    student: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export class ApplicationService {
  // Create a new application
  static async createApplication(
    studentId: string, 
    data: CreateApplicationInput
  ): Promise<ApplicationWithRelations> {
    // Check if application already exists for this student, university, and type
    const existingApplication = await prisma.application.findUnique({
      where: {
        studentId_universityId_applicationType: {
          studentId,
          universityId: data.universityId,
          applicationType: data.applicationType
        }
      }
    });

    if (existingApplication) {
      throw new Error('Application already exists for this university and application type');
    }

    // Verify university exists
    const university = await prisma.university.findUnique({
      where: { id: data.universityId }
    });

    if (!university) {
      throw new Error('University not found');
    }

    // Calculate deadline if not provided or use provided deadline
    let deadline: Date;
    if (data.deadline) {
      deadline = new Date(data.deadline);
    } else {
      // Parse university deadlines from JSON string
      const universityDeadlines = university.deadlines 
        ? JSON.parse(university.deadlines) 
        : null;
      deadline = DeadlineService.calculateDeadline(
        data.applicationType, 
        universityDeadlines
      );
    }

    // Create the application
    const application = await prisma.application.create({
      data: {
        studentId,
        universityId: data.universityId,
        applicationType: data.applicationType,
        deadline,
        notes: data.notes,
        status: 'not_started'
      },
      include: {
        university: true,
        requirements: true,
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Record initial status in history
    await ApplicationStatusService.recordStatusChange(
      application.id,
      null,
      'not_started',
      studentId,
      'Application created'
    );

    // Create default requirements based on application type
    await this.createDefaultRequirements(application.id, data.applicationType);

    // Return application with requirements
    const result = await this.getApplicationById(application.id, studentId);
    if (!result) {
      throw new Error('Failed to retrieve created application');
    }
    return result;
  }

  // Get application by ID
  static async getApplicationById(
    applicationId: string, 
    studentId: string
  ): Promise<ApplicationWithRelations | null> {
    return await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      },
      include: {
        university: true,
        requirements: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        statusHistory: {
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
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  // Get all applications for a student
  static async getApplicationsByStudent(
    studentId: string,
    query: ApplicationQueryInput = { page: 1, limit: 10 }
  ): Promise<{
    applications: ApplicationWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, applicationType, universityId, page = 1, limit = 10 } = query;
    
    const where: Prisma.ApplicationWhereInput = {
      studentId,
      ...(status && { status }),
      ...(applicationType && { applicationType }),
      ...(universityId && { universityId })
    };

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          university: true,
          requirements: {
            orderBy: {
              createdAt: 'asc'
            }
          },
          statusHistory: {
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
            },
            take: 5 // Limit status history for list view
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          deadline: 'asc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.application.count({ where })
    ]);

    return {
      applications,
      total,
      page,
      limit
    };
  }

  // Update application
  static async updateApplication(
    applicationId: string,
    studentId: string,
    data: UpdateApplicationInput
  ): Promise<ApplicationWithRelations> {
    // Verify application exists and belongs to student
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!existingApplication) {
      throw new Error('Application not found');
    }

    // Validate status transitions
    if (data.status && data.status !== existingApplication.status) {
      const validation = ApplicationStatusService.validateStatusTransition(
        existingApplication.status as ApplicationStatus, 
        data.status
      );
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid status transition');
      }
    }

    // Update the application
    const updatedApplication = await prisma.application.update({
      where: { id: applicationId },
      data: {
        ...(data.applicationType && { applicationType: data.applicationType }),
        ...(data.deadline && { deadline: new Date(data.deadline) }),
        ...(data.status && { status: data.status }),
        ...(data.submittedDate !== undefined && { 
          submittedDate: data.submittedDate ? new Date(data.submittedDate) : null 
        }),
        ...(data.decisionDate !== undefined && { 
          decisionDate: data.decisionDate ? new Date(data.decisionDate) : null 
        }),
        ...(data.decisionType !== undefined && { decisionType: data.decisionType }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date()
      },
      include: {
        university: true,
        requirements: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        statusHistory: {
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
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Record status change if status was updated
    if (data.status && data.status !== existingApplication.status) {
      await ApplicationStatusService.recordStatusChange(
        applicationId,
        existingApplication.status as ApplicationStatus,
        data.status,
        studentId,
        'Status updated manually'
      );
    }

    // Send decision notification if decision was added/updated
    if (data.decisionType && data.decisionDate && 
        (data.decisionType !== existingApplication.decisionType || 
         data.decisionDate !== existingApplication.decisionDate?.toISOString())) {
      notificationScheduler.sendDecisionNotification(
        applicationId,
        data.decisionType,
        new Date(data.decisionDate)
      ).catch(error => {
        console.error('Failed to send decision notification:', error);
      });
    }

    return updatedApplication;
  }

  // Delete application
  static async deleteApplication(applicationId: string, studentId: string): Promise<void> {
    // Verify application exists and belongs to student
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!existingApplication) {
      throw new Error('Application not found');
    }

    await prisma.application.delete({
      where: { id: applicationId }
    });
  }

  // Create default requirements for an application
  private static async createDefaultRequirements(
    applicationId: string, 
    applicationType: string
  ): Promise<void> {
    // Import RequirementsService to use the enhanced requirement generation
    const { RequirementsService } = await import('./requirements');
    
    // Get the application to access university information
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { university: true }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Use RequirementsService to create the checklist
    await RequirementsService.createRequirementsChecklist(
      applicationId,
      application.universityId,
      applicationType,
      application.studentId
    );
  }

  // Validate status transitions
  private static validateStatusTransition(
    currentStatus: ApplicationStatus, 
    newStatus: ApplicationStatus
  ): void {
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      'not_started': ['in_progress'],
      'in_progress': ['submitted', 'not_started'],
      'submitted': ['under_review'],
      'under_review': ['decided'],
      'decided': [] // No transitions from decided
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  // Get application statistics for a student
  static async getApplicationStats(studentId: string): Promise<{
    total: number;
    byStatus: Record<ApplicationStatus, number>;
    byType: Record<string, number>;
    upcomingDeadlines: number;
    completionRate: number;
    averageProgress: number;
  }> {
    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        requirements: {
          select: {
            status: true
          }
        }
      }
    });

    const total = applications.length;
    const byStatus = applications.reduce((acc, app) => {
      acc[app.status as ApplicationStatus] = (acc[app.status as ApplicationStatus] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    const byType = applications.reduce((acc, app) => {
      acc[app.applicationType] = (acc[app.applicationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count deadlines within next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const upcomingDeadlines = applications.filter(app => 
      app.deadline <= thirtyDaysFromNow && 
      (app.status === 'not_started' || app.status === 'in_progress')
    ).length;

    // Calculate completion rate (submitted + decided applications)
    const completedApplications = applications.filter(app => 
      ['submitted', 'under_review', 'decided'].includes(app.status)
    ).length;
    const completionRate = total > 0 ? Math.round((completedApplications / total) * 100) : 0;

    // Calculate average progress across all applications
    let totalProgress = 0;
    if (total > 0) {
      applications.forEach(app => {
        const totalRequirements = app.requirements.length;
        const completedRequirements = app.requirements.filter(req => req.status === 'completed').length;
        
        let appProgress = 0;
        if (totalRequirements > 0) {
          const requirementProgress = (completedRequirements / totalRequirements) * 80;
          const statusProgress = this.getStatusProgress(app.status);
          appProgress = requirementProgress + statusProgress;
        } else {
          appProgress = this.getStatusProgress(app.status) * 5;
        }
        
        totalProgress += appProgress;
      });
    }
    const averageProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    return {
      total,
      byStatus,
      byType,
      upcomingDeadlines,
      completionRate,
      averageProgress
    };
  }

  // Helper method to get progress based on status
  private static getStatusProgress(status: string): number {
    switch (status) {
      case 'not_started': return 0;
      case 'in_progress': return 10;
      case 'submitted': return 15;
      case 'under_review': return 18;
      case 'decided': return 20;
      default: return 0;
    }
  }

  // Application requirement methods
  static async createRequirement(
    applicationId: string,
    studentId: string,
    data: CreateApplicationRequirementInput
  ) {
    // Verify application exists and belongs to student
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    return await prisma.applicationRequirement.create({
      data: {
        applicationId,
        requirementType: data.requirementType,
        title: data.title,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline) : null,
        notes: data.notes,
        status: 'not_started'
      }
    });
  }

  static async updateRequirement(
    requirementId: string,
    studentId: string,
    data: UpdateApplicationRequirementInput
  ) {
    // Verify requirement exists and belongs to student's application
    const requirement = await prisma.applicationRequirement.findFirst({
      where: {
        id: requirementId,
        application: {
          studentId
        }
      }
    });

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    return await prisma.applicationRequirement.update({
      where: { id: requirementId },
      data: {
        ...(data.requirementType && { requirementType: data.requirementType }),
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.deadline !== undefined && { 
          deadline: data.deadline ? new Date(data.deadline) : null 
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date()
      }
    });
  }

  static async deleteRequirement(requirementId: string, studentId: string): Promise<void> {
    // Verify requirement exists and belongs to student's application
    const requirement = await prisma.applicationRequirement.findFirst({
      where: {
        id: requirementId,
        application: {
          studentId
        }
      }
    });

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    await prisma.applicationRequirement.delete({
      where: { id: requirementId }
    });
  }

  static async getRequirementsByApplication(
    applicationId: string,
    studentId: string
  ) {
    // Verify application exists and belongs to student
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    return await prisma.applicationRequirement.findMany({
      where: {
        applicationId
      },
      orderBy: [
        { status: 'asc' }, // Show incomplete requirements first
        { deadline: 'asc' }, // Then by deadline
        { createdAt: 'asc' } // Finally by creation order
      ]
    });
  }

  // Generate default requirements based on university and application type
  static async generateDefaultRequirements(
    applicationId: string,
    universityId: string,
    applicationType: string
  ): Promise<CreateApplicationRequirementInput[]> {
    // Get university information to customize requirements
    const university = await prisma.university.findUnique({
      where: { id: universityId }
    });

    if (!university) {
      throw new Error('University not found');
    }

    const requirements: CreateApplicationRequirementInput[] = [
      {
        requirementType: 'transcript',
        title: 'Official Transcript',
        description: 'Submit official high school transcript with all completed coursework'
      },
      {
        requirementType: 'test_scores',
        title: 'Standardized Test Scores',
        description: 'Submit SAT or ACT scores (check university requirements for minimum scores)'
      },
      {
        requirementType: 'essay',
        title: 'Personal Statement',
        description: 'Write and submit personal statement essay (typically 500-650 words)'
      },
      {
        requirementType: 'recommendation',
        title: 'Letters of Recommendation',
        description: 'Obtain letters of recommendation from teachers, counselors, or mentors'
      }
    ];

    // Add application-type specific requirements
    if (applicationType === 'early_decision') {
      requirements.push({
        requirementType: 'essay',
        title: 'Early Decision Agreement',
        description: 'Sign and submit Early Decision agreement form (binding commitment)'
      });
      requirements.push({
        requirementType: 'essay',
        title: 'Why This School Essay',
        description: 'Write supplemental essay explaining your commitment to this university'
      });
    } else if (applicationType === 'early_action') {
      requirements.push({
        requirementType: 'essay',
        title: 'Why This School Essay',
        description: 'Write supplemental essay explaining why you want to attend this university'
      });
    }

    // Add Common App specific requirements
    if (university.applicationSystem === 'Common App') {
      requirements.push({
        requirementType: 'essay',
        title: 'Common Application Essay',
        description: 'Complete one of the Common Application essay prompts'
      });
    }

    return requirements;
  }
}