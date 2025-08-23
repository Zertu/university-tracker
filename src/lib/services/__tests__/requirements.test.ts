import { RequirementsService } from '../requirements';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    application: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    applicationRequirement: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    university: {
      findUnique: jest.fn(),
    },
  },
}));

describe('RequirementsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRequirementsWithProgress', () => {
    it('should return requirements with progress indicators', async () => {
      const mockApplication = {
        id: 'app-1',
        studentId: 'student-1',
      };

      const mockRequirements = [
        {
          id: 'req-1',
          applicationId: 'app-1',
          requirementType: 'essay',
          title: 'Personal Statement',
          description: 'Write personal statement',
          status: 'not_started',
          deadline: new Date('2024-12-31'),
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'req-2',
          applicationId: 'app-1',
          requirementType: 'transcript',
          title: 'Official Transcript',
          description: 'Submit transcript',
          status: 'completed',
          deadline: new Date('2024-11-30'),
          notes: 'Submitted via school portal',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.application.findFirst as any).mockResolvedValue(mockApplication);
      (prisma.applicationRequirement.findMany as any).mockResolvedValue(mockRequirements);

      const result = await RequirementsService.getRequirementsWithProgress('app-1', 'student-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'req-1',
        title: 'Personal Statement',
        status: 'not_started',
      });
      expect(result[0]).toHaveProperty('isOverdue');
      expect(result[0]).toHaveProperty('daysUntilDeadline');
    });

    it('should throw error if application not found', async () => {
      (prisma.application.findFirst as any).mockResolvedValue(null);

      await expect(
        RequirementsService.getRequirementsWithProgress('app-1', 'student-1')
      ).rejects.toThrow('Application not found');
    });
  });

  describe('getRequirementsSummary', () => {
    it('should return correct summary statistics', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          status: 'completed',
          deadline: new Date('2024-11-30'),
          isOverdue: false,
          daysUntilDeadline: null,
        },
        {
          id: 'req-2',
          status: 'in_progress',
          deadline: new Date('2024-12-31'),
          isOverdue: false,
          daysUntilDeadline: 30,
        },
        {
          id: 'req-3',
          status: 'not_started',
          deadline: new Date('2024-10-01'),
          isOverdue: true,
          daysUntilDeadline: -30,
        },
      ];

      // Mock the getRequirementsWithProgress method
      jest.spyOn(RequirementsService, 'getRequirementsWithProgress').mockResolvedValue(
        mockRequirements as any
      );

      const result = await RequirementsService.getRequirementsSummary('app-1', 'student-1');

      expect(result).toEqual({
        total: 3,
        completed: 1,
        inProgress: 1,
        notStarted: 1,
        overdue: 1,
        completionPercentage: 33,
      });
    });
  });

  describe('createRequirementsChecklist', () => {
    it('should create requirements based on university and application type', async () => {
      const mockApplication = {
        id: 'app-1',
        studentId: 'student-1',
      };

      const mockUniversity = {
        id: 'uni-1',
        name: 'Test University',
        applicationSystem: 'Common App',
      };

      (prisma.application.findFirst as any).mockResolvedValue(mockApplication);
      (prisma.university.findUnique as any).mockResolvedValue(mockUniversity);
      (prisma.applicationRequirement.createMany as any).mockResolvedValue({ count: 5 });

      await RequirementsService.createRequirementsChecklist(
        'app-1',
        'uni-1',
        'early_decision',
        'student-1'
      );

      expect(prisma.applicationRequirement.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            applicationId: 'app-1',
            requirementType: 'transcript',
            status: 'not_started',
          }),
        ]),
      });
    });

    it('should throw error if application not found', async () => {
      (prisma.application.findFirst as any).mockResolvedValue(null);

      await expect(
        RequirementsService.createRequirementsChecklist('app-1', 'uni-1', 'regular', 'student-1')
      ).rejects.toThrow('Application not found');
    });
  });

  describe('updateRequirementStatus', () => {
    it('should update requirement status and trigger application status update', async () => {
      const mockRequirement = {
        id: 'req-1',
        applicationId: 'app-1',
        application: {
          id: 'app-1',
          studentId: 'student-1',
        },
      };

      (prisma.applicationRequirement.findFirst as any).mockResolvedValue(mockRequirement);
      (prisma.applicationRequirement.update as any).mockResolvedValue({});
      
      // Mock the private method calls
      jest.spyOn(RequirementsService, 'getRequirementsSummary').mockResolvedValue({
        total: 3,
        completed: 2,
        inProgress: 1,
        notStarted: 0,
        overdue: 0,
        completionPercentage: 67,
      });

      await RequirementsService.updateRequirementStatus('req-1', 'student-1', 'completed');

      expect(prisma.applicationRequirement.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: {
          status: 'completed',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw error if requirement not found', async () => {
      (prisma.applicationRequirement.findFirst as any).mockResolvedValue(null);

      await expect(
        RequirementsService.updateRequirementStatus('req-1', 'student-1', 'completed')
      ).rejects.toThrow('Requirement not found');
    });
  });

  describe('getUpcomingRequirements', () => {
    it('should return requirements due within specified days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockApplications = [
        {
          studentId: 'student-1',
          requirements: [
            {
              id: 'req-1',
              title: 'Essay',
              deadline: futureDate,
              status: 'not_started',
              requirementType: 'essay',
              applicationId: 'app-1',
              description: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          university: {
            name: 'Test University',
          },
        },
      ];

      (prisma.application.findMany as any).mockResolvedValue(mockApplications);

      const result = await RequirementsService.getUpcomingRequirements('student-1', 7);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Essay');
      expect(result[0].daysUntilDeadline).toBe(5);
      expect(result[0].isOverdue).toBe(false);
    });
  });

  describe('getOverdueRequirements', () => {
    it('should return requirements that are past their deadline', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockApplications = [
        {
          studentId: 'student-1',
          requirements: [
            {
              id: 'req-1',
              title: 'Overdue Essay',
              deadline: pastDate,
              status: 'not_started',
              requirementType: 'essay',
              applicationId: 'app-1',
              description: null,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          university: {
            name: 'Test University',
          },
        },
      ];

      (prisma.application.findMany as any).mockResolvedValue(mockApplications);

      const result = await RequirementsService.getOverdueRequirements('student-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Overdue Essay');
      expect(result[0].isOverdue).toBe(true);
      expect(result[0].daysUntilDeadline).toBe(-5);
    });
  });
});