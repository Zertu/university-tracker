import { getServerSession } from 'next-auth/next'
import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function getSession() {
  return await getServerSession()
}

export async function getCurrentUser() {
  const session = await getSession()
  
  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  
  return user
}

interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: string
  createdAt: Date
  updatedAt: Date
}

// Middleware helper for API routes
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return await handler(request, user)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Role-based middleware for API routes
export async function withRole(
  request: NextRequest,
  allowedRoles: string[],
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  try {
    const user = await requireRole(allowedRoles)
    return await handler(request, user)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (error.message === 'Forbidden') {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    console.error('Role middleware error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Specific role middleware functions for common use cases
export async function withStudentRole(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withRole(request, ['student'], handler)
}

export async function withParentRole(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withRole(request, ['parent'], handler)
}

export async function withAdminRole(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withRole(request, ['admin'], handler)
}

export async function withStudentOrParentRole(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withRole(request, ['student', 'parent'], handler)
}

export async function withTeacherOrAdminRole(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withRole(request, ['teacher', 'admin'], handler)
}

// Enhanced user validation with role checking
export async function validateUserAccess(userId: string, requestingUser: AuthenticatedUser): Promise<boolean> {
  // Users can always access their own data
  if (userId === requestingUser.id) {
    return true
  }

  // Parents can access their children's data
  if (requestingUser.role === 'parent') {
    const parentChildLink = await prisma.parentChildLink.findFirst({
      where: {
        parentId: requestingUser.id,
        childId: userId,
      },
    })
    return !!parentChildLink
  }

  // Admins can access any user's data
  if (requestingUser.role === 'admin') {
    return true
  }

  // Teachers can access student data (future enhancement)
  if (requestingUser.role === 'teacher') {
    // TODO: Implement teacher-student relationship checking
    return false
  }

  return false
}

// Middleware for user-specific resource access
export async function withUserAccess(
  request: NextRequest,
  userId: string,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return withAuth(request, async (req, user) => {
    const hasAccess = await validateUserAccess(userId, user)
    
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    return await handler(req, user)
  })
}
