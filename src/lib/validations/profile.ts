import { z } from 'zod';

// Academic profile validation schemas
export const CreateStudentProfileSchema = z.object({
  graduationYear: z.number()
    .int()
    .min(2020, 'Graduation year must be 2020 or later')
    .max(2030, 'Graduation year must be 2030 or earlier')
    .optional(),
  gpa: z.number()
    .min(0, 'GPA must be at least 0.0')
    .max(4.0, 'GPA must be at most 4.0')
    .optional(),
  satScore: z.number()
    .int()
    .min(400, 'SAT score must be at least 400')
    .max(1600, 'SAT score must be at most 1600')
    .optional(),
  actScore: z.number()
    .int()
    .min(1, 'ACT score must be at least 1')
    .max(36, 'ACT score must be at most 36')
    .optional(),
  targetCountries: z.array(z.string().min(1, 'Country name cannot be empty'))
    .min(1, 'At least one target country is required')
    .optional(),
  intendedMajors: z.array(z.string().min(1, 'Major name cannot be empty'))
    .min(1, 'At least one intended major is required')
    .optional(),
});

export const UpdateStudentProfileSchema = CreateStudentProfileSchema.partial();

// Profile completion check schema
export const ProfileCompletionSchema = z.object({
  hasBasicInfo: z.boolean(),
  hasAcademicInfo: z.boolean(),
  hasPreferences: z.boolean(),
  completionPercentage: z.number().min(0).max(100),
  missingFields: z.array(z.string()),
});

// Academic profile query schema
export const ProfileQuerySchema = z.object({
  includeRecommendations: z.boolean().optional(),
  includeStats: z.boolean().optional(),
});

// Types derived from schemas
export type CreateStudentProfileInput = z.infer<typeof CreateStudentProfileSchema>;
export type UpdateStudentProfileInput = z.infer<typeof UpdateStudentProfileSchema>;
export type ProfileCompletionData = z.infer<typeof ProfileCompletionSchema>;
export type ProfileQueryInput = z.infer<typeof ProfileQuerySchema>;

// Validation helper functions
export function validateGPA(gpa: number): boolean {
  return gpa >= 0 && gpa <= 4.0;
}

export function validateSATScore(score: number): boolean {
  return score >= 400 && score <= 1600;
}

export function validateACTScore(score: number): boolean {
  return score >= 1 && score <= 36;
}

export function validateGraduationYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 1 && year <= currentYear + 10;
}

// Profile completion calculation
export function calculateProfileCompletion(profile: any): ProfileCompletionData {
  const missingFields: string[] = [];
  let completedFields = 0;
  const totalFields = 6; // graduationYear, gpa/test scores, targetCountries, intendedMajors

  // Check graduation year
  if (!profile?.graduationYear) {
    missingFields.push('graduationYear');
  } else {
    completedFields++;
  }

  // Check academic scores (at least one required)
  if (!profile?.gpa && !profile?.satScore && !profile?.actScore) {
    missingFields.push('academicScores');
  } else {
    completedFields++;
  }

  // Check target countries
  if (!profile?.targetCountries || profile.targetCountries.length === 0) {
    missingFields.push('targetCountries');
  } else {
    completedFields++;
  }

  // Check intended majors
  if (!profile?.intendedMajors || profile.intendedMajors.length === 0) {
    missingFields.push('intendedMajors');
  } else {
    completedFields++;
  }

  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  return {
    hasBasicInfo: !!profile?.graduationYear,
    hasAcademicInfo: !!(profile?.gpa || profile?.satScore || profile?.actScore),
    hasPreferences: !!(profile?.targetCountries?.length && profile?.intendedMajors?.length),
    completionPercentage,
    missingFields,
  };
}
