import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAdminRole } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['student', 'parent', 'teacher', 'admin']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminRole(request, async () => {
    try {
      const { id: userId } = await params

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: true,
          parentLinks: {
            include: {
              child: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          childLinks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          },
          applications: {
            include: {
              university: {
                select: {
                  id: true,
                  name: true,
                  country: true,
                }
              }
            }
          },
          _count: {
            select: {
              applications: true,
              parentLinks: true,
              childLinks: true,
              notifications: true,
            }
          }
        }
      })

      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ user: targetUser })
    } catch (error) {
      console.error('User fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminRole(request, async (req, user) => {
    try {
      const { id: userId } = await params
      const body = await request.json()
      const validatedData = updateUserSchema.parse(body)

      // Prevent admins from changing their own role to non-admin
      if (userId === user.id && validatedData.role && validatedData.role !== 'admin') {
        return NextResponse.json(
          { error: 'Cannot change your own admin role' },
          { status: 400 }
        )
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: validatedData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        }
      })

      return NextResponse.json({
        message: 'User updated successfully',
        user: updatedUser,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('User update error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminRole(request, async (req, user) => {
    try {
      const { id: userId } = await params

      // Prevent admins from deleting their own account
      if (userId === user.id) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        )
      }

      await prisma.user.delete({
        where: { id: userId },
      })

      return NextResponse.json({
        message: 'User deleted successfully',
      })
    } catch (error) {
      console.error('User deletion error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}