import { NextRequest } from 'next/server';
import { z, ZodSchema } from 'zod';
import { ValidationError } from './error-handler';

export interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export interface ValidatedRequest<
  TBody = any,
  TQuery = any,
  TParams = any
> extends NextRequest {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
  validatedParams?: TParams;
}

export async function validateRequest<
  TBody = any,
  TQuery = any,
  TParams = any
>(
  request: NextRequest,
  options: ValidationOptions,
  params?: Record<string, string>
): Promise<{
  body?: TBody;
  query?: TQuery;
  params?: TParams;
}> {
  const result: any = {};

  // Validate request body
  if (options.body) {
    try {
      const body = await request.json();
      result.body = options.body.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError('Request body validation failed', error.issues);
      }
      throw ValidationError('Invalid JSON in request body');
    }
  }

  // Validate query parameters
  if (options.query) {
    try {
      const url = new URL(request.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      result.query = options.query.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError('Query parameters validation failed', error.issues);
      }
      throw error;
    }
  }

  // Validate route parameters
  if (options.params && params) {
    try {
      result.params = options.params.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError('Route parameters validation failed', error.issues);
      }
      throw error;
    }
  }

  return result;
}

// Higher-order function to create validated API handlers
export function withValidation<TBody = any, TQuery = any, TParams = any>(
  options: ValidationOptions,
  handler: (
    request: NextRequest,
    context: { params?: Record<string, string> },
    validated: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
    }
  ) => Promise<Response>
) {
  return async (
    request: NextRequest,
    context: { params?: Record<string, string> }
  ): Promise<Response> => {
    const validated = await validateRequest<TBody, TQuery, TParams>(
      request,
      options,
      context.params
    );

    return handler(request, context, validated);
  };
}

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  }),

  search: z.object({
    q: z.string().optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// File validation
export function validateFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(
  file: File,
  maxSizeInMB: number
): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

// Rate limiting validation
export function createRateLimitKey(
  request: NextRequest,
  identifier?: string
): string {
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const path = new URL(request.url).pathname;
  
  return `${identifier || ip}:${path}:${userAgent}`;
}
