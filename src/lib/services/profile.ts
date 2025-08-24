import { prisma } from '@/lib/prisma';
import { 
  CreateStudentProfileInput, 
  UpdateStudentProfileInput,
  ProfileCompletionData,
  calculateProfileCompletion
} from '@/lib/validations/profile';
import { Prisma } from '@prisma/client';

// Type for student profile with user relation
export type StudentProfileWithUser = Prisma.StudentProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
      };
    };
  };
}>;

export class ProfileService {
  // Get student profile by user ID
  static async getProfileByUserId(userId: string): Promise<StudentProfileWithUser | null> {
    const profile = await prisma.studentProfile.findUnique({
      where: {
        userId,
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

    return profile;
  }

  // Create a new student profile
  static async createProfile(
    userId: string, 
    data: CreateStudentProfileInput
  ): Promise<StudentProfileWithUser> {
    // Check if profile already exists
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new Error('Student profile already exists for this user');
    }

    // Validate user exists and is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'student') {
      throw new Error('Only students can have academic profiles');
    }

    // Convert arrays to JSON strings for database storage
    const profileData = {
      userId,
      graduationYear: data.graduationYear,
      gpa: data.gpa,
      satScore: data.satScore,
      actScore: data.actScore,
      targetCountries: data.targetCountries ? JSON.stringify(data.targetCountries) : null,
      intendedMajors: data.intendedMajors ? JSON.stringify(data.intendedMajors) : null,
    };

    const profile = await prisma.studentProfile.create({
      data: profileData,
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

    return profile;
  }

  // Update student profile
  static async updateProfile(
    userId: string, 
    data: UpdateStudentProfileInput
  ): Promise<StudentProfileWithUser> {
    // Check if profile exists
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new Error('Student profile not found');
    }

    // Prepare update data
    const updateData: any = {};
    
    if (data.graduationYear !== undefined) {
      updateData.graduationYear = data.graduationYear;
    }
    
    if (data.gpa !== undefined) {
      updateData.gpa = data.gpa;
    }
    
    if (data.satScore !== undefined) {
      updateData.satScore = data.satScore;
    }
    
    if (data.actScore !== undefined) {
      updateData.actScore = data.actScore;
    }
    
    if (data.targetCountries !== undefined) {
      updateData.targetCountries = data.targetCountries ? JSON.stringify(data.targetCountries) : null;
    }
    
    if (data.intendedMajors !== undefined) {
      updateData.intendedMajors = data.intendedMajors ? JSON.stringify(data.intendedMajors) : null;
    }

    const profile = await prisma.studentProfile.update({
      where: { userId },
      data: updateData,
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

    return profile;
  }

  // Delete student profile
  static async deleteProfile(userId: string): Promise<void> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('Student profile not found');
    }

    await prisma.studentProfile.delete({
      where: { userId },
    });
  }

  // Get profile completion status
  static async getProfileCompletion(userId: string): Promise<ProfileCompletionData> {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return {
        hasBasicInfo: false,
        hasAcademicInfo: false,
        hasPreferences: false,
        completionPercentage: 0,
        missingFields: ['graduationYear', 'academicScores', 'targetCountries', 'intendedMajors'],
      };
    }

    // Parse JSON fields
    const profileData = {
      ...profile,
      targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
      intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
    };

    return calculateProfileCompletion(profileData);
  }

  // Create or update profile (upsert)
  static async upsertProfile(
    userId: string, 
    data: CreateStudentProfileInput
  ): Promise<StudentProfileWithUser> {
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return this.updateProfile(userId, data);
    } else {
      return this.createProfile(userId, data);
    }
  }

  // Get profile statistics for recommendations
  static async getProfileStats(userId: string) {
    const profile = await this.getProfileByUserId(userId);
    
    if (!profile) {
      return null;
    }

    // Parse JSON fields
    const targetCountries = profile.targetCountries ? JSON.parse(profile.targetCountries) : [];
    const intendedMajors = profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [];

    return {
      academicLevel: this.calculateAcademicLevel(profile),
      competitiveness: this.calculateCompetitiveness(profile),
      preferences: {
        countries: targetCountries,
        majors: intendedMajors,
      },
      scores: {
        gpa: profile.gpa,
        sat: profile.satScore,
        act: profile.actScore,
      },
    };
  }

  // Helper method to calculate academic level
  private static calculateAcademicLevel(profile: any): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // GPA scoring
    if (profile.gpa) {
      if (profile.gpa >= 3.7) score += 3;
      else if (profile.gpa >= 3.3) score += 2;
      else score += 1;
    }
    
    // SAT scoring
    if (profile.satScore) {
      if (profile.satScore >= 1400) score += 3;
      else if (profile.satScore >= 1200) score += 2;
      else score += 1;
    }
    
    // ACT scoring
    if (profile.actScore) {
      if (profile.actScore >= 30) score += 3;
      else if (profile.actScore >= 25) score += 2;
      else score += 1;
    }

    // Average the scores
    const maxPossibleScore = 3;
    const averageScore = score / maxPossibleScore;
    
    if (averageScore >= 2.5) return 'high';
    if (averageScore >= 1.5) return 'medium';
    return 'low';
  }

  // Helper method to calculate competitiveness
  private static calculateCompetitiveness(profile: any): number {
    let competitiveness = 0;
    
    // GPA contribution (40%)
    if (profile.gpa) {
      competitiveness += (profile.gpa / 4.0) * 0.4;
    }
    
    // SAT contribution (30%)
    if (profile.satScore) {
      competitiveness += ((profile.satScore - 400) / 1200) * 0.3;
    }
    
    // ACT contribution (30%)
    if (profile.actScore) {
      competitiveness += ((profile.actScore - 1) / 35) * 0.3;
    }

    return Math.min(Math.max(competitiveness, 0), 1); // Clamp between 0 and 1
  }

  // Validate profile data integrity
  static async validateProfileIntegrity(userId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const profile = await this.getProfileByUserId(userId);
    const errors: string[] = [];

    if (!profile) {
      return {
        isValid: false,
        errors: ['Profile not found'],
      };
    }

    // Validate GPA
    if (profile.gpa !== null && (profile.gpa < 0 || profile.gpa > 4.0)) {
      errors.push('GPA must be between 0.0 and 4.0');
    }

    // Validate SAT score
    if (profile.satScore !== null && (profile.satScore < 400 || profile.satScore > 1600)) {
      errors.push('SAT score must be between 400 and 1600');
    }

    // Validate ACT score
    if (profile.actScore !== null && (profile.actScore < 1 || profile.actScore > 36)) {
      errors.push('ACT score must be between 1 and 36');
    }

    // Validate graduation year
    const currentYear = new Date().getFullYear();
    if (profile.graduationYear !== null && 
        (profile.graduationYear < currentYear - 1 || profile.graduationYear > currentYear + 10)) {
      errors.push('Graduation year must be within a reasonable range');
    }

    // Validate JSON fields
    try {
      if (profile.targetCountries) {
        const countries = JSON.parse(profile.targetCountries);
        if (!Array.isArray(countries)) {
          errors.push('Target countries must be an array');
        }
      }
    } catch {
      errors.push('Invalid target countries format');
    }

    try {
      if (profile.intendedMajors) {
        const majors = JSON.parse(profile.intendedMajors);
        if (!Array.isArray(majors)) {
          errors.push('Intended majors must be an array');
        }
      }
    } catch {
      errors.push('Invalid intended majors format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
