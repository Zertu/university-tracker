import { Toast } from '@/components/ui/toast';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class AppError extends Error {
  public readonly code?: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: any): error is ApiError {
  return error && typeof error.message === 'string';
}

export function handleApiError(error: any): ApiError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
      status: 0,
    };
  }

  // Response errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request. Please check your input.',
          code: 'BAD_REQUEST',
          status,
          details: data?.details,
        };
      case 401:
        return {
          message: 'You are not authenticated. Please log in.',
          code: 'UNAUTHORIZED',
          status,
        };
      case 403:
        return {
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN',
          status,
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          status,
        };
      case 422:
        return {
          message: data?.message || 'Validation failed. Please check your input.',
          code: 'VALIDATION_ERROR',
          status,
          details: data?.details,
        };
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          status,
        };
      case 500:
        return {
          message: 'Internal server error. Please try again later.',
          code: 'INTERNAL_ERROR',
          status,
        };
      default:
        return {
          message: data?.message || 'An unexpected error occurred.',
          code: 'UNKNOWN_ERROR',
          status,
        };
    }
  }

  // AppError instances
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    };
  }

  // Generic errors
  return {
    message: error.message || 'An unexpected error occurred.',
    code: 'UNKNOWN_ERROR',
  };
}

export function errorToToast(error: ApiError): Omit<Toast, 'id'> {
  const isUserError = error.status && error.status >= 400 && error.status < 500;
  
  return {
    type: 'error',
    title: isUserError ? 'Invalid Request' : 'Something went wrong',
    message: error.message,
    duration: 0, // Don't auto-dismiss error toasts
    action: error.code === 'NETWORK_ERROR' ? {
      label: 'Retry',
      onClick: () => window.location.reload(),
    } : undefined,
  };
}

export function logError(error: any, context?: string) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  console.error('Application Error:', errorInfo);

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }
}

// Hook for handling async operations with error handling
export function useAsyncError() {
  return (error: any, context?: string) => {
    logError(error, context);
    const apiError = handleApiError(error);
    throw new AppError(apiError.message, apiError.code, apiError.status, apiError.details);
  };
}

// Utility for wrapping async functions with error handling
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw handleApiError(error);
    }
  };
}

// Retry utility for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      const apiError = handleApiError(error);
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}
