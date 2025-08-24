import { NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';

export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 422: return 'VALIDATION_ERROR';
      case 429: return 'RATE_LIMITED';
      case 500: return 'INTERNAL_ERROR';
      default: return 'UNKNOWN_ERROR';
    }
  }
}

export function createErrorResponse(
  error: ApiError | Error | ZodError | any,
  path?: string
): NextResponse<ApiErrorResponse> {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 422;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.issues.reduce((acc: Record<string, string>, err: ZodIssue) => {
      const field = err.path.join('.');
      acc[field] = err.message;
      return acc;
    }, {} as Record<string, string>);
  } else if (error.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma errors
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this information already exists';
        code = 'DUPLICATE_RECORD';
        details = { field: error.meta?.target };
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        code = 'NOT_FOUND';
        break;
      default:
        statusCode = 500;
        message = 'Database error occurred';
        code = 'DATABASE_ERROR';
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Log error for debugging (in production, send to monitoring service)
  console.error('API Error:', {
    message,
    code,
    statusCode,
    details,
    stack: error.stack,
    path,
    timestamp: new Date().toISOString(),
  });

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = undefined;
  }

  const errorResponse: ApiErrorResponse = {
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
      path,
    },
  };

  return NextResponse.json(errorResponse, { status: statusCode });
}

// Predefined error creators
export const BadRequestError = (message: string, details?: any) =>
  new ApiError(message, 400, 'BAD_REQUEST', details);

export const UnauthorizedError = (message: string = 'Authentication required') =>
  new ApiError(message, 401, 'UNAUTHORIZED');

export const ForbiddenError = (message: string = 'Access denied') =>
  new ApiError(message, 403, 'FORBIDDEN');

export const NotFoundError = (message: string = 'Resource not found') =>
  new ApiError(message, 404, 'NOT_FOUND');

export const ValidationError = (message: string, details?: any) =>
  new ApiError(message, 422, 'VALIDATION_ERROR', details);

export const RateLimitError = (message: string = 'Too many requests') =>
  new ApiError(message, 429, 'RATE_LIMITED');

export const InternalError = (message: string = 'Internal server error') =>
  new ApiError(message, 500, 'INTERNAL_ERROR');

// Error handler wrapper for API routes
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      const request = args[0] as Request;
      const path = new URL(request.url).pathname;
      return createErrorResponse(error, path);
    }
  };
}

// Async error handler for use in try-catch blocks
export function handleAsyncError(error: any, context?: string): never {
  if (error instanceof ApiError) {
    throw error;
  }
  
  console.error(`Error in ${context}:`, error);
  throw new ApiError(
    error.message || 'An unexpected error occurred',
    500,
    'INTERNAL_ERROR'
  );
}
