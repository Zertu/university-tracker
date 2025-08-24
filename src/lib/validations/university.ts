import { z } from 'zod';

// University validation schema
export const universitySchema = z.object({
  name: z.string().min(1, 'University name is required').max(200, 'University name too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name too long'),
  state: z.string().max(100, 'State name too long').optional().nullable(),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  usNewsRanking: z.number().int().min(1).max(1000).optional().nullable(),
  acceptanceRate: z.number().min(0).max(1, 'Acceptance rate must be between 0 and 1').optional().nullable(),
  applicationSystem: z.enum(['Common App', 'Coalition', 'Direct']),
  tuitionInState: z.number().min(0, 'Tuition cannot be negative').optional().nullable(),
  tuitionOutState: z.number().min(0, 'Tuition cannot be negative').optional().nullable(),
  applicationFee: z.number().min(0, 'Application fee cannot be negative').optional().nullable(),
  deadlines: z.string().optional().nullable(),
  majorsOffered: z.string().optional().nullable(),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable(),
});

// University search/filter validation schema
export const universitySearchSchema = z.object({
  query: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  applicationSystem: z.enum(['Common App', 'Coalition', 'Direct']).optional(),
  minAcceptanceRate: z.number().min(0).max(1).optional(),
  maxAcceptanceRate: z.number().min(0).max(1).optional(),
  minRanking: z.number().int().min(1).optional(),
  maxRanking: z.number().int().min(1).optional(),
  maxTuition: z.number().min(0).optional(),
  majors: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// University comparison validation schema
export const universityComparisonSchema = z.object({
  universityIds: z.array(z.string().cuid()).min(2, 'At least 2 universities required for comparison').max(5, 'Maximum 5 universities can be compared'),
});

// University creation/update validation
export const createUniversitySchema = universitySchema;
export const updateUniversitySchema = universitySchema.partial();

// Type exports
export type UniversityInput = z.infer<typeof universitySchema>;
export type UniversitySearchInput = z.infer<typeof universitySearchSchema>;
export type UniversityComparisonInput = z.infer<typeof universityComparisonSchema>;
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type UpdateUniversityInput = z.infer<typeof updateUniversitySchema>;

// Validation helper functions
export function validateUniversity(data: unknown): UniversityInput {
  return universitySchema.parse(data);
}

export function validateUniversitySearch(data: unknown): UniversitySearchInput {
  return universitySearchSchema.parse(data);
}

export function validateUniversityComparison(data: unknown): UniversityComparisonInput {
  return universityComparisonSchema.parse(data);
}

// University data utility functions
export function parseUniversityDeadlines(deadlinesJson: string | null): Record<string, string> | null {
  if (!deadlinesJson) return null;
  try {
    return JSON.parse(deadlinesJson);
  } catch {
    return null;
  }
}

export function parseUniversityMajors(majorsJson: string | null): string[] {
  if (!majorsJson) return [];
  try {
    return JSON.parse(majorsJson);
  } catch {
    return [];
  }
}

export function formatUniversityDeadlines(deadlines: Record<string, string> | null): string | null {
  if (!deadlines) return null;
  try {
    return JSON.stringify(deadlines);
  } catch {
    return null;
  }
}

export function formatUniversityMajors(majors: string[]): string | null {
  if (!majors || majors.length === 0) return null;
  try {
    return JSON.stringify(majors);
  } catch {
    return null;
  }
}

// University search utility functions
export function buildUniversitySearchQuery(filters: UniversitySearchInput) {
  const where: unknown = {};

  if (filters.query) {
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { city: { contains: filters.query, mode: 'insensitive' } },
      { state: { contains: filters.query, mode: 'insensitive' } },
      { country: { contains: filters.query, mode: 'insensitive' } },
    ];
  }

  if (filters.country) {
    where.country = { equals: filters.country, mode: 'insensitive' };
  }

  if (filters.state) {
    where.state = { equals: filters.state, mode: 'insensitive' };
  }

  if (filters.city) {
    where.city = { equals: filters.city, mode: 'insensitive' };
  }

  if (filters.applicationSystem) {
    where.applicationSystem = filters.applicationSystem;
  }

  if (filters.minAcceptanceRate !== undefined || filters.maxAcceptanceRate !== undefined) {
    where.acceptanceRate = {};
    if (filters.minAcceptanceRate !== undefined) {
      where.acceptanceRate.gte = filters.minAcceptanceRate;
    }
    if (filters.maxAcceptanceRate !== undefined) {
      where.acceptanceRate.lte = filters.maxAcceptanceRate;
    }
  }

  if (filters.minRanking !== undefined || filters.maxRanking !== undefined) {
    where.usNewsRanking = {};
    if (filters.minRanking !== undefined) {
      where.usNewsRanking.gte = filters.minRanking;
    }
    if (filters.maxRanking !== undefined) {
      where.usNewsRanking.lte = filters.maxRanking;
    }
  }

  if (filters.maxTuition !== undefined) {
    where.OR = [
      ...(where.OR || []),
      { tuitionInState: { lte: filters.maxTuition } },
      { tuitionOutState: { lte: filters.maxTuition } },
    ];
  }

  return where;
}
