import { prisma } from '@/lib/prisma';
import { 
  CreateApplicationRequirementInput,
  RequirementType,
  RequirementStatus
} from '@/lib/validations/application';

export type RequirementWithProgress = {
  id: string;
  applicationId: string;
  requirementType: RequirementType;
  title: string;
  description: string | null;
  status: RequirementStatus;
  deadline: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  isOverdue: boolean;
  daysUntilDeadline: number | null;
};

export class RequirementsService {
  // Get requirements with progress indicators
  static async getRequirementsWithProgress(
    applicationId: string,
    studentId: string
  ): Promise<RequirementWithProgress[]> {
    // Verify application belongs to student
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const requirements = await prisma.applicationRequirement.findMany({
      where: {
        applicationId
      },
      orderBy: [
        { status: 'asc' }, // Show incomplete requirements first
        { deadline: 'asc' }, // Then by deadline
        { createdAt: 'asc' } // Finally by creation order
      ]
    });

    const now = new Date();

    return requirements.map(req => {
      const daysUntilDeadline = req.deadline 
        ? Math.ceil((req.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      const isOverdue = req.deadline 
        ? req.deadline < now && req.status !== 'completed'
        : false;

      return {
        ...req,
        isOverdue,
        daysUntilDeadline
      };
    });
  }

  // Get requirements summary for an application
  static async getRequirementsSummary(
    applicationId: string,
    studentId: string
  ): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    completionPercentage: number;
  }> {
    const requirements = await this.getRequirementsWithProgress(applicationId, studentId);
    
    const total = requirements.length;
    const completed = requirements.filter(r => r.status === 'completed').length;
    const inProgress = requirements.filter(r => r.status === 'in_progress').length;
    const notStarted = requirements.filter(r => r.status === 'not_started').length;
    const overdue = requirements.filter(r => r.isOverdue).length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      notStarted,
      overdue,
      completionPercentage
    };
  }

  // Create requirements checklist based on university and application type
  static async createRequirementsChecklist(
    applicationId: string,
    universityId: string,
    applicationType: string,
    studentId: string
  ): Promise<void> {
    // Verify application belongs to student
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Get university information
    const university = await prisma.university.findUnique({
      where: { id: universityId }
    });

    if (!university) {
      throw new Error('University not found');
    }

    // Generate requirements based on university and application type
    const requirements = this.generateRequirementsByType(university, applicationType);

    // Create requirements in database
    await prisma.applicationRequirement.createMany({
      data: requirements.map(req => ({
        applicationId,
        ...req,
        status: 'not_started' as RequirementStatus
      }))
    });
  }

  // Generate requirements based on university and application type
  private static generateRequirementsByType(
    university: { applicationSystem: string },
    applicationType: string
  ): CreateApplicationRequirementInput[] {
    const baseRequirements: CreateApplicationRequirementInput[] = [
      {
        requirementType: 'transcript',
        title: 'Official High School Transcript',
        description: 'Submit official transcript showing all completed coursework and grades'
      },
      {
        requirementType: 'test_scores',
        title: 'Standardized Test Scores',
        description: 'Submit SAT or ACT scores. Check university requirements for minimum scores.'
      },
      {
        requirementType: 'recommendation',
        title: 'Letters of Recommendation',
        description: 'Typically 2-3 letters from teachers, counselors, or mentors who know you well'
      }
    ];

    // Add application system specific requirements
    if (university.applicationSystem === 'Common App') {
      baseRequirements.push({
        requirementType: 'essay',
        title: 'Common Application Essay',
        description: 'Choose and respond to one of the Common Application essay prompts (650 words max)'
      });
    } else {
      baseRequirements.push({
        requirementType: 'essay',
        title: 'Personal Statement',
        description: 'Write a personal statement essay as required by the university'
      });
    }

    // Add supplemental essays for most applications
    baseRequirements.push({
      requirementType: 'essay',
      title: 'Supplemental Essays',
      description: 'Complete any supplemental essays required by the university'
    });

    // Add application type specific requirements
    if (applicationType === 'early_decision') {
      baseRequirements.push({
        requirementType: 'essay',
        title: 'Early Decision Agreement',
        description: 'Sign and submit Early Decision agreement (binding commitment to attend if accepted)'
      });
      baseRequirements.push({
        requirementType: 'essay',
        title: 'Why This School Essay',
        description: 'Demonstrate your commitment and specific interest in this university'
      });
    } else if (applicationType === 'early_action') {
      baseRequirements.push({
        requirementType: 'essay',
        title: 'Why This School Essay',
        description: 'Explain your specific interest in this university and why it\'s a good fit'
      });
    }

    return baseRequirements;
  }

  // Update requirement status and auto-calculate application progress
  static async updateRequirementStatus(
    requirementId: string,
    studentId: string,
    status: RequirementStatus,
    notes?: string
  ): Promise<void> {
    // Verify requirement belongs to student's application
    const requirement = await prisma.applicationRequirement.findFirst({
      where: {
        id: requirementId,
        application: {
          studentId
        }
      },
      include: {
        application: true
      }
    });

    if (!requirement) {
      throw new Error('Requirement not found');
    }

    // Update requirement
    await prisma.applicationRequirement.update({
      where: { id: requirementId },
      data: {
        status,
        ...(notes !== undefined && { notes }),
        updatedAt: new Date()
      }
    });

    // Auto-update application status based on requirements progress
    await this.updateApplicationStatusBasedOnRequirements(
      requirement.applicationId,
      studentId
    );
  }

  // Auto-update application status based on requirements completion
  private static async updateApplicationStatusBasedOnRequirements(
    applicationId: string,
    studentId: string
  ): Promise<void> {
    const summary = await this.getRequirementsSummary(applicationId, studentId);
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      }
    });

    if (!application) {
      return;
    }

    let newStatus = application.status;

    // Auto-transition logic based on requirements completion
    if (application.status === 'not_started' && summary.inProgress > 0) {
      newStatus = 'in_progress';
    } else if (
      application.status === 'in_progress' && 
      summary.completionPercentage === 100
    ) {
      // Don't auto-submit, but could suggest it's ready for submission
      // This would be handled by the application status service
    }

    // Update application status if it should change
    if (newStatus !== application.status) {
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: newStatus }
      });
    }
  }

  // Get requirements that are due soon
  static async getUpcomingRequirements(
    studentId: string,
    daysAhead: number = 7
  ): Promise<RequirementWithProgress[]> {
    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        requirements: true,
        university: {
          select: {
            name: true
          }
        }
      }
    });

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    const upcomingRequirements: RequirementWithProgress[] = [];

    for (const app of applications) {
      for (const req of app.requirements) {
        if (
          req.deadline &&
          req.deadline >= now &&
          req.deadline <= futureDate &&
          req.status !== 'completed'
        ) {
          const daysUntilDeadline = Math.ceil(
            (req.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          upcomingRequirements.push({
            ...req,
            isOverdue: false,
            daysUntilDeadline
          });
        }
      }
    }

    return upcomingRequirements.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      return 0;
    });
  }

  // Get overdue requirements
  static async getOverdueRequirements(studentId: string): Promise<RequirementWithProgress[]> {
    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        requirements: true,
        university: {
          select: {
            name: true
          }
        }
      }
    });

    const now = new Date();
    const overdueRequirements: RequirementWithProgress[] = [];

    for (const app of applications) {
      for (const req of app.requirements) {
        if (
          req.deadline &&
          req.deadline < now &&
          req.status !== 'completed'
        ) {
          const daysUntilDeadline = Math.ceil(
            (req.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          overdueRequirements.push({
            ...req,
            isOverdue: true,
            daysUntilDeadline
          });
        }
      }
    }

    return overdueRequirements.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      return 0;
    });
  }

  // Set individual requirement deadline
  static async setRequirementDeadline(
    requirementId: string,
    studentId: string,
    deadline: Date | null
  ): Promise<void> {
    // Verify requirement belongs to student's application
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

    await prisma.applicationRequirement.update({
      where: { id: requirementId },
      data: {
        deadline,
        updatedAt: new Date()
      }
    });
  }

  // Get requirement progress tracking data
  static async getRequirementProgress(
    applicationId: string,
    studentId: string
  ): Promise<{
    totalRequirements: number;
    completedRequirements: number;
    progressPercentage: number;
    nextDeadline: Date | null;
    criticalRequirements: RequirementWithProgress[];
    recentlyCompleted: RequirementWithProgress[];
  }> {
    const requirements = await this.getRequirementsWithProgress(applicationId, studentId);
    
    const totalRequirements = requirements.length;
    const completedRequirements = requirements.filter(r => r.status === 'completed').length;
    const progressPercentage = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

    // Find next deadline
    const upcomingRequirements = requirements
      .filter(r => r.deadline && r.status !== 'completed' && !r.isOverdue)
      .sort((a, b) => {
        if (a.deadline && b.deadline) {
          return a.deadline.getTime() - b.deadline.getTime();
        }
        return 0;
      });
    
    const nextDeadline = upcomingRequirements.length > 0 ? upcomingRequirements[0].deadline : null;

    // Critical requirements (due within 3 days or overdue)
    const criticalRequirements = requirements.filter(r => 
      r.status !== 'completed' && (
        r.isOverdue || 
        (r.daysUntilDeadline !== null && r.daysUntilDeadline <= 3)
      )
    );

    // Recently completed requirements (completed within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentlyCompleted = requirements.filter(r => 
      r.status === 'completed' && 
      r.updatedAt >= sevenDaysAgo
    );

    return {
      totalRequirements,
      completedRequirements,
      progressPercentage,
      nextDeadline,
      criticalRequirements,
      recentlyCompleted
    };
  }

  // Add notes to requirement
  static async addRequirementNote(
    requirementId: string,
    studentId: string,
    note: string
  ): Promise<void> {
    // Verify requirement belongs to student's application
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

    // Append note to existing notes or create new
    const existingNotes = requirement.notes || '';
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${note}`;
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n${newNote}`
      : newNote;

    await prisma.applicationRequirement.update({
      where: { id: requirementId },
      data: {
        notes: updatedNotes,
        updatedAt: new Date()
      }
    });
  }

  // Get requirement deadline alerts for a student
  static async getRequirementDeadlineAlerts(
    studentId: string
  ): Promise<{
    critical: RequirementWithProgress[]; // Due today or overdue
    warning: RequirementWithProgress[];  // Due within 3 days
    upcoming: RequirementWithProgress[]; // Due within 7 days
  }> {
    const applications = await prisma.application.findMany({
      where: { studentId },
      include: {
        requirements: true,
        university: {
          select: {
            name: true
          }
        }
      }
    });

    const now = new Date();
    const critical: RequirementWithProgress[] = [];
    const warning: RequirementWithProgress[] = [];
    const upcoming: RequirementWithProgress[] = [];

    for (const app of applications) {
      for (const req of app.requirements) {
        if (req.status === 'completed' || !req.deadline) {
          continue;
        }

        const daysUntilDeadline = Math.ceil(
          (req.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const isOverdue = req.deadline < now;

        const requirementWithProgress: RequirementWithProgress = {
          ...req,
          isOverdue,
          daysUntilDeadline
        };

        if (isOverdue || daysUntilDeadline <= 0) {
          critical.push(requirementWithProgress);
        } else if (daysUntilDeadline <= 3) {
          warning.push(requirementWithProgress);
        } else if (daysUntilDeadline <= 7) {
          upcoming.push(requirementWithProgress);
        }
      }
    }

    // Sort by deadline
    const sortByDeadline = (a: RequirementWithProgress, b: RequirementWithProgress) => {
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      return 0;
    };

    return {
      critical: critical.sort(sortByDeadline),
      warning: warning.sort(sortByDeadline),
      upcoming: upcoming.sort(sortByDeadline)
    };
  }

  // Auto-generate deadlines for requirements based on application deadline
  static async generateRequirementDeadlines(
    applicationId: string,
    studentId: string,
    applicationDeadline: Date
  ): Promise<void> {
    // Verify application belongs to student
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        studentId
      },
      include: {
        requirements: true
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // Calculate deadlines for different requirement types
    const deadlineCalculations = {
      'transcript': -14, // 2 weeks before application deadline
      'test_scores': -21, // 3 weeks before application deadline
      'recommendation': -28, // 4 weeks before application deadline
      'essay': -7 // 1 week before application deadline
    };

    const updates = application.requirements
      .filter(req => !req.deadline) // Only update requirements without deadlines
      .map(req => {
        const daysOffset = deadlineCalculations[req.requirementType as keyof typeof deadlineCalculations] || -7;
        const deadline = new Date(applicationDeadline);
        deadline.setDate(deadline.getDate() + daysOffset);

        return prisma.applicationRequirement.update({
          where: { id: req.id },
          data: {
            deadline,
            updatedAt: new Date()
          }
        });
      });

    await Promise.all(updates);
  }
}