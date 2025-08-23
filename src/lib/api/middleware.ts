import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from './error-handler';
import { withValidation, ValidationOptions } from './validation';
import { withAuth, withRole, withPermission, AuthContext } from './auth';
import { withRateLimit, rateLimiters } from './rate-limit';

export interface ApiMiddlewareOptions {
  // Authentication
  requireAuth?: boolean;
  roles?: string | string[];
  permission?: { resource: string; action: 'create' | 'read' | 'update' | 'delete' };
  
  // Validation
  validation?: ValidationOptions;
  
  // Rate limiting
  rateLimit?: 'general' | 'auth' | 'upload' | 'search' | 'none';
  customRateLimit?: ReturnType<typeof import('./rate-limit').createRateLimit>;
  
  // CORS
  cors?: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  };
  
  // Logging
  enableLogging?: boolean;
  logLevel?: 'info' | 'warn' | 'error';
}

export interface ApiHandler<TBody = any, TQuery = any, TParams = any> {
  (
    request: NextRequest,
    context: { params?: Record<string, string> },
    extras: {
      auth?: AuthContext;
      validated?: {
        body?: TBody;
        query?: TQuery;
        params?: TParams;
      };
    }
  ): Promise<NextResponse>;
}

// Main middleware composer
export function createApiHandler<TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: ApiMiddlewareOptions = {}
) {
  let composedHandler = handler;

  // Apply middleware in reverse order (last applied = first executed)
  
  // 1. Error handling (outermost)
  composedHandler = withErrorHandler(async (request, context) => {
    const extras: any = {};

    // 2. CORS handling
    if (options.cors) {
      const corsResponse = handleCORS(request, options.cors);
      if (corsResponse) return corsResponse;
    }

    // 3. Logging
    if (options.enableLogging !== false) {
      logRequest(request, options.logLevel || 'info');
    }

    // 4. Rate limiting
    if (options.rateLimit && options.rateLimit !== 'none') {
      const rateLimiter = options.customRateLimit || rateLimiters[options.rateLimit];
      if (rateLimiter) {
        const { allowed, resetTime, remaining } = rateLimiter.check(request);
        if (!allowed) {
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
          return NextResponse.json(
            { error: { message: `Too many requests. Try again in ${retryAfter} seconds.` } },
            { 
              status: 429,
              headers: {
                'Retry-After': retryAfter.toString(),
                'X-RateLimit-Limit': rateLimiters.general.check(request).remaining.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(resetTime).toISOString(),
              }
            }
          );
        }
      }
    }

    // 5. Authentication
    if (options.requireAuth || options.roles || options.permission) {
      const { getAuthenticatedUser } = await import('./auth');
      extras.auth = await getAuthenticatedUser(request);

      // Role-based authorization
      if (options.roles) {
        const roles = Array.isArray(options.roles) ? options.roles : [options.roles];
        if (!roles.includes(extras.auth.user.role)) {
          return NextResponse.json(
            { error: { message: `Access denied. Required role: ${roles.join(' or ')}` } },
            { status: 403 }
          );
        }
      }

      // Permission-based authorization
      if (options.permission) {
        const { hasPermission } = await import('./auth');
        if (!hasPermission(extras.auth.user.role, options.permission.resource, options.permission.action)) {
          return NextResponse.json(
            { error: { message: `Permission denied: ${options.permission.action} ${options.permission.resource}` } },
            { status: 403 }
          );
        }
      }
    }

    // 6. Validation
    if (options.validation) {
      const { validateRequest } = await import('./validation');
      extras.validated = await validateRequest<TBody, TQuery, TParams>(
        request,
        options.validation,
        context.params
      );
    }

    // 7. Execute handler
    const response = await handler(request, context, extras);

    // 8. Add security headers
    addSecurityHeaders(response);

    // 9. Log response
    if (options.enableLogging !== false) {
      logResponse(response, options.logLevel || 'info');
    }

    return response;
  });

  return composedHandler;
}

// CORS handling
function handleCORS(request: NextRequest, corsOptions: NonNullable<ApiMiddlewareOptions['cors']>): NextResponse | null {
  const origin = request.headers.get('origin');
  const method = request.method;

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const headers = new Headers();
    
    // Set allowed origins
    if (corsOptions.origin) {
      const allowedOrigins = Array.isArray(corsOptions.origin) ? corsOptions.origin : [corsOptions.origin];
      if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
      }
    } else {
      headers.set('Access-Control-Allow-Origin', '*');
    }

    // Set allowed methods
    if (corsOptions.methods) {
      headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    } else {
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }

    // Set allowed headers
    if (corsOptions.headers) {
      headers.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '));
    } else {
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }

    // Set credentials
    if (corsOptions.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new NextResponse(null, { status: 200, headers });
  }

  return null;
}

// Security headers
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

// Request logging
function logRequest(request: NextRequest, level: 'info' | 'warn' | 'error') {
  const logData = {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    timestamp: new Date().toISOString(),
  };

  if (level === 'info') {
    console.log('API Request:', logData);
  } else if (level === 'warn') {
    console.warn('API Request:', logData);
  } else {
    console.error('API Request:', logData);
  }
}

// Response logging
function logResponse(response: NextResponse, level: 'info' | 'warn' | 'error') {
  const logData = {
    status: response.status,
    statusText: response.statusText,
    timestamp: new Date().toISOString(),
  };

  if (level === 'info') {
    console.log('API Response:', logData);
  } else if (level === 'warn') {
    console.warn('API Response:', logData);
  } else {
    console.error('API Response:', logData);
  }
}

// Convenience functions for common patterns
export const createPublicHandler = <TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: Omit<ApiMiddlewareOptions, 'requireAuth'> = {}
) => createApiHandler(handler, { ...options, requireAuth: false });

export const createProtectedHandler = <TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: Omit<ApiMiddlewareOptions, 'requireAuth'> = {}
) => createApiHandler(handler, { ...options, requireAuth: true });

export const createAdminHandler = <TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: Omit<ApiMiddlewareOptions, 'requireAuth' | 'roles'> = {}
) => createApiHandler(handler, { ...options, requireAuth: true, roles: 'admin' });

export const createStudentHandler = <TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: Omit<ApiMiddlewareOptions, 'requireAuth' | 'roles'> = {}
) => createApiHandler(handler, { ...options, requireAuth: true, roles: 'student' });

export const createParentHandler = <TBody = any, TQuery = any, TParams = any>(
  handler: ApiHandler<TBody, TQuery, TParams>,
  options: Omit<ApiMiddlewareOptions, 'requireAuth' | 'roles'> = {}
) => createApiHandler(handler, { ...options, requireAuth: true, roles: 'parent' });