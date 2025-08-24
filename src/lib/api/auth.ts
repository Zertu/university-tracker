import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { UnauthorizedError, ForbiddenError } from './error-handler';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
}

export interface AuthContext {
  user: AuthenticatedUser;
  session: any;
}

// Get authenticated user from request
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthContext> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new UnauthorizedError('Authentication required');
  }

  return {
    user: session.user as AuthenticatedUser,
    session,
  };
}

// Middleware to require authentication
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: any, auth: AuthContext) => Promise<Response>
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    const auth = await getAuthenticatedUser(request);
    return handler(request, context, auth);
  };
}

// Role-based authorization
export function withRole(
  allowedRoles: string | string[],
  handler: (request: NextRequest, context: any, auth: AuthContext) => Promise<Response>
) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return withAuth(async (request, context, auth) => {
    if (!roles.includes(auth.user.role)) {
      throw new ForbiddenError(`Access denied. Required role: ${roles.join(' or ')}`);
    }

    return handler(request, context, auth);
  });
}

// Resource ownership authorization
export function withOwnership<T>(
  getResourceOwnerId: (resourceId: string, auth: AuthContext) => Promise<string>,
  handler: (request: NextRequest, context: any, auth: AuthContext) => Promise<Response>
) {
  return withAuth(async (request, context, auth) => {
    const resourceId = context.params?.id;
    
    if (!resourceId) {
      throw new ForbiddenError('Resource ID required for ownership check');
    }

    const ownerId = await getResourceOwnerId(resourceId, auth);

    // Allow access if user owns the resource or is an admin
    if (auth.user.id !== ownerId && auth.user.role !== 'admin') {
      throw new ForbiddenError('You can only access your own resources');
    }

    return handler(request, context, auth);
  });
}

// Parent-child relationship authorization
export function withParentChildAccess(
  getStudentId: (context: any) => string,
  handler: (request: NextRequest, context: any, auth: AuthContext) => Promise<Response>
) {
  return withAuth(async (request, context, auth) => {
    const studentId = getStudentId(context);

    // Students can access their own data
    if (auth.user.role === 'student' && auth.user.id === studentId) {
      return handler(request, context, auth);
    }

    // Parents can access their children's data
    if (auth.user.role === 'parent') {
      const hasAccess = await checkParentChildRelationship(auth.user.id, studentId);
      if (!hasAccess) {
        throw new ForbiddenError('You can only access your children\'s data');
      }
      return handler(request, context, auth);
    }

    // Admins can access all data
    if (auth.user.role === 'admin') {
      return handler(request, context, auth);
    }

    throw new ForbiddenError('Access denied');
  });
}

// Check if parent has access to student's data
async function checkParentChildRelationship(parentId: string, studentId: string): Promise<boolean> {
  // This would typically query the database
  // For now, we'll implement a basic check
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const relationship = await prisma.parentChildLink.findFirst({
      where: {
        parentId,
        childId: studentId,
      },
    });

    await prisma.$disconnect();
    return !!relationship;
  } catch (error) {
    console.error('Error checking parent-child relationship:', error);
    return false;
  }
}

// Permission-based authorization
export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

const rolePermissions: Record<string, Permission[]> = {
  student: [
    { resource: 'application', action: 'create' },
    { resource: 'application', action: 'read' },
    { resource: 'application', action: 'update' },
    { resource: 'application', action: 'delete' },
    { resource: 'profile', action: 'read' },
    { resource: 'profile', action: 'update' },
    { resource: 'university', action: 'read' },
  ],
  parent: [
    { resource: 'application', action: 'read' },
    { resource: 'profile', action: 'read' },
    { resource: 'university', action: 'read' },
    { resource: 'note', action: 'create' },
    { resource: 'note', action: 'read' },
    { resource: 'note', action: 'update' },
    { resource: 'note', action: 'delete' },
  ],
  teacher: [
    { resource: 'application', action: 'read' },
    { resource: 'profile', action: 'read' },
    { resource: 'university', action: 'read' },
    { resource: 'recommendation', action: 'create' },
    { resource: 'recommendation', action: 'update' },
  ],
  admin: [
    { resource: '*', action: 'create' },
    { resource: '*', action: 'read' },
    { resource: '*', action: 'update' },
    { resource: '*', action: 'delete' },
  ],
};

export function hasPermission(userRole: string, resource: string, action: string): boolean {
  const permissions = rolePermissions[userRole] || [];
  
  return permissions.some(permission => 
    (permission.resource === '*' || permission.resource === resource) &&
    permission.action === action
  );
}

export function withPermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  handler: (request: NextRequest, context: any, auth: AuthContext) => Promise<Response>
) {
  return withAuth(async (request, context, auth) => {
    if (!hasPermission(auth.user.role, resource, action)) {
      throw new ForbiddenError(`Permission denied: ${action} ${resource}`);
    }

    return handler(request, context, auth);
  });
}

// API key authentication (for external integrations)
export function withApiKey(
  handler: (request: NextRequest, context: any, apiKey: string) => Promise<Response>
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    const apiKey = request.headers.get('x-api-key') || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedError('API key required');
    }

    // Validate API key (implement your own validation logic)
    const isValidApiKey = await validateApiKey(apiKey);
    if (!isValidApiKey) {
      throw new UnauthorizedError('Invalid API key');
    }

    return handler(request, context, apiKey);
  };
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  // Implement API key validation logic
  // This could involve checking against a database or external service
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  return validApiKeys.includes(apiKey);
}

// Session validation
export function validateSession(session: any): boolean {
  if (!session || !session.user) {
    return false;
  }

  // Check if session is expired
  if (session.expires && new Date(session.expires) < new Date()) {
    return false;
  }

  // Check if user has required fields
  if (!session.user.id || !session.user.email || !session.user.role) {
    return false;
  }

  return true;
}

// CSRF protection
export function withCSRFProtection(
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  return async (request: NextRequest, context: any): Promise<Response> => {
    // Skip CSRF check for GET requests
    if (request.method === 'GET') {
      return handler(request, context);
    }

    const csrfToken = request.headers.get('x-csrf-token');
    const sessionCsrfToken = request.headers.get('x-session-csrf-token');

    if (!csrfToken || !sessionCsrfToken || csrfToken !== sessionCsrfToken) {
      throw new ForbiddenError('CSRF token mismatch');
    }

    return handler(request, context);
  };
}
