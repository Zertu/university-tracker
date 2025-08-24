import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProfileService } from '../profile';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    studentProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPrisma = prisma as any;

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getProfileByUserId', () => {
    it('should return profile when found', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 1450,
        actScore: null,
        targetCountries: '["United States", "Canada"]',
        intendedMajors: '["Computer Science", "Engineering"]',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'student',
        },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfileByUserId('user-1');

      expect(result).toEqual(mockProfile);
      expect(mockPrisma.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    it('should return null when profile not found', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const result = await ProfileService.getProfileByUserId('user-1');

      expect(result).toBeNull();
    });
  });

  describe('createProfile', () => {
    it('should create profile successfully', async () => {
      const mockUser = {
        id: 'user-1',
        role: 'student',
      };

      const profileData = {
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 1450,
        targetCountries: ['United States', 'Canada'],
        intendedMajors: ['Computer Science'],
      };

      const mockCreatedProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 1450,
        actScore: null,
        targetCountries: '["United States", "Canada"]',
        intendedMajors: '["Computer Science"]',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'student',
        },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.studentProfile.create.mockResolvedValue(mockCreatedProfile);

      const result = await ProfileService.createProfile('user-1', profileData);

      expect(result).toEqual(mockCreatedProfile);
      expect(mockPrisma.studentProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          graduationYear: 2025,
          gpa: 3.8,
          satScore: 1450,
          actScore: undefined,
          targetCountries: '["United States","Canada"]',
          intendedMajors: '["Computer Science"]',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw error if profile already exists', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      mockPrisma.studentProfile.findUnique.mockResolvedValue(existingProfile);

      await expect(
        ProfileService.createProfile('user-1', { graduationYear: 2025 })
      ).rejects.toThrow('Student profile already exists for this user');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        ProfileService.createProfile('user-1', { graduationYear: 2025 })
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user is not a student', async () => {
      const mockUser = { id: 'user-1', role: 'parent' };
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        ProfileService.createProfile('user-1', { graduationYear: 2025 })
      ).rejects.toThrow('Only students can have academic profiles');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const existingProfile = { id: 'profile-1', userId: 'user-1' };
      const updateData = { gpa: 3.9, satScore: 1500 };
      const updatedProfile = {
        ...existingProfile,
        gpa: 3.9,
        satScore: 1500,
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'student',
        },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(existingProfile);
      mockPrisma.studentProfile.update.mockResolvedValue(updatedProfile);

      const result = await ProfileService.updateProfile('user-1', updateData);

      expect(result).toEqual(updatedProfile);
      expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { gpa: 3.9, satScore: 1500 },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw error if profile not found', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      await expect(
        ProfileService.updateProfile('user-1', { gpa: 3.9 })
      ).rejects.toThrow('Student profile not found');
    });
  });

  describe('getProfileCompletion', () => {
    it('should calculate completion correctly for complete profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 3.8,
        satScore: null,
        actScore: null,
        targetCountries: '["United States"]',
        intendedMajors: '["Computer Science"]',
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfileCompletion('user-1');

      expect(result.hasBasicInfo).toBe(true);
      expect(result.hasAcademicInfo).toBe(true);
      expect(result.hasPreferences).toBe(true);
      expect(result.completionPercentage).toBe(100);
      expect(result.missingFields).toEqual([]);
    });

    it('should calculate completion correctly for incomplete profile', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: null,
        gpa: null,
        satScore: null,
        actScore: null,
        targetCountries: null,
        intendedMajors: null,
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfileCompletion('user-1');

      expect(result.hasBasicInfo).toBe(false);
      expect(result.hasAcademicInfo).toBe(false);
      expect(result.hasPreferences).toBe(false);
      expect(result.completionPercentage).toBe(0);
      expect(result.missingFields).toEqual([
        'graduationYear',
        'academicScores',
        'targetCountries',
        'intendedMajors',
      ]);
    });

    it('should return default completion for non-existent profile', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const result = await ProfileService.getProfileCompletion('user-1');

      expect(result.hasBasicInfo).toBe(false);
      expect(result.hasAcademicInfo).toBe(false);
      expect(result.hasPreferences).toBe(false);
      expect(result.completionPercentage).toBe(0);
      expect(result.missingFields).toEqual([
        'graduationYear',
        'academicScores',
        'targetCountries',
        'intendedMajors',
      ]);
    });
  });

  describe('validateProfileIntegrity', () => {
    it('should validate correct profile data', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 1450,
        actScore: 32,
        targetCountries: '["United States"]',
        intendedMajors: '["Computer Science"]',
        user: { id: 'user-1', name: 'John', email: 'john@example.com', role: 'student' },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.validateProfileIntegrity('user-1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid GPA', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 5.0, // Invalid GPA
        satScore: 1450,
        actScore: 32,
        targetCountries: '["United States"]',
        intendedMajors: '["Computer Science"]',
        user: { id: 'user-1', name: 'John', email: 'john@example.com', role: 'student' },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.validateProfileIntegrity('user-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GPA must be between 0.0 and 4.0');
    });

    it('should detect invalid SAT score', async () => {
      const mockProfile = {
        id: 'profile-1',
        userId: 'user-1',
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 2000, // Invalid SAT score
        actScore: 32,
        targetCountries: '["United States"]',
        intendedMajors: '["Computer Science"]',
        user: { id: 'user-1', name: 'John', email: 'john@example.com', role: 'student' },
      };

      mockPrisma.studentProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.validateProfileIntegrity('user-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SAT score must be between 400 and 1600');
    });

    it('should return error for non-existent profile', async () => {
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const result = await ProfileService.validateProfileIntegrity('user-1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(['Profile not found']);
    });
  });
});
