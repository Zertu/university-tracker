import { z } from 'zod';

// Application type enum
export const ApplicationTypeSchema = z.enum([
  'early_decision',
  'early_action', 
  'regular',
  'rolling'
]);

// Application status enum
export const ApplicationStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'submitted',
  'under_review',
  'decided'
]);

// Decision type enum
export const DecisionTypeSchema = z.enum([
  'accepted',
  'rejected',
  'waitlisted'
]);

// Create application schema
export const CreateApplicationSchema = z.object({
  universityId: z.string().min(1, 'University is required'),
  applicationType: ApplicationTypeSchema,
  deadline: z.string().datetime('Invalid deadline format').optional(),
  notes: z.string().optional()
});

// Update application schema
export const UpdateApplicationSchema = z.object({
  applicationType: ApplicationTypeSchema.optional(),
  deadline: z.string().datetime('Invalid deadline format').optional(),
  status: ApplicationStatusSchema.optional(),
  submittedDate: z.string().datetime('Invalid submitted date format').optional().nullable(),
  decisionDate: z.string().datetime('Invalid decision date format').optional().nullable(),
  decisionType: DecisionTypeSchema.optional().nullable(),
  notes: z.string().optional().nullable()
});

// Application requirement type enum
export const RequirementTypeSchema = z.enum([
  'essay',
  'recommendation',
  'transcript',
  'test_scores'
]);

// Requirement status enum
export const RequirementStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed'
]);

// Create application requirement schema
export const CreateApplicationRequirementSchema = z.object({
  requirementType: RequirementTypeSchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  deadline: z.string().datetime('Invalid deadline format').optional(),
  notes: z.string().optional()
});

// Update application requirement schema
export const UpdateApplicationRequirementSchema = z.object({
  requirementType: RequirementTypeSchema.optional(),
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  status: RequirementStatusSchema.optional(),
  deadline: z.string().datetime('Invalid deadline format').optional().nullable(),
  notes: z.string().optional().nullable()
});

// Query schemas
export const ApplicationQuerySchema = z.object({
  status: ApplicationStatusSchema.optional(),
  applicationType: ApplicationTypeSchema.optional(),
  universityId: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default(() => 1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default(() => 10)
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
export type CreateApplicationRequirementInput = z.infer<typeof CreateApplicationRequirementSchema>;
export type UpdateApplicationRequirementInput = z.infer<typeof UpdateApplicationRequirementSchema>;
export type ApplicationQueryInput = z.infer<typeof ApplicationQuerySchema>;
export type ApplicationType = z.infer<typeof ApplicationTypeSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type DecisionType = z.infer<typeof DecisionTypeSchema>;
export type RequirementType = z.infer<typeof RequirementTypeSchema>;
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;
