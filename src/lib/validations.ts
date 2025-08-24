import { z } from 'zod'

// User validation schemas
export const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'parent', 'teacher', 'admin']).default('student'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Student profile validation
export const studentProfileSchema = z.object({
  graduationYear: z.number().int().min(2020).max(2030).optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  satScore: z.number().int().min(400).max(1600).optional(),
  actScore: z.number().int().min(1).max(36).optional(),
  targetCountries: z.array(z.string()).default([]),
  intendedMajors: z.array(z.string()).default([]),
})

// University validation
export const universitySchema = z.object({
  name: z.string().min(1, 'University name is required'),
  country: z.string().min(1, 'Country is required'),
  state: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  usNewsRanking: z.number().int().positive().optional(),
  acceptanceRate: z.number().min(0).max(1).optional(),
  applicationSystem: z.enum(['Common App', 'Coalition', 'Direct']),
  tuitionInState: z.number().positive().optional(),
  tuitionOutState: z.number().positive().optional(),
  applicationFee: z.number().min(0).optional(),
  deadlines: z.object({
    early_decision: z.string().optional(),
    early_action: z.string().optional(),
    regular: z.string().optional(),
  }).optional(),
  majorsOffered: z.array(z.string()).default([]),
  websiteUrl: z.string().url().optional(),
})

// Application validation
export const applicationSchema = z.object({
  universityId: z.string().cuid('Invalid university ID'),
  applicationType: z.enum(['early_decision', 'early_action', 'regular', 'rolling']),
  deadline: z.date(),
  status: z.enum(['not_started', 'in_progress', 'submitted', 'under_review', 'decided']).default('not_started'),
  submittedDate: z.date().optional(),
  decisionDate: z.date().optional(),
  decisionType: z.enum(['accepted', 'rejected', 'waitlisted']).optional(),
  notes: z.string().optional(),
})

// Application requirement validation
export const applicationRequirementSchema = z.object({
  applicationId: z.string().cuid('Invalid application ID'),
  requirementType: z.enum(['essay', 'recommendation', 'transcript', 'test_scores']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
  deadline: z.date().optional(),
  notes: z.string().optional(),
})
