import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAdminRole } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['student', 'parent', 'teacher', 'admin']).optional(),
})

export async function GET(request: NextRequest) {
  return withAdminRole(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '10')
      const role = searchParams.get('role')
      const search = searchParams.get('search')

      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {}
      if (role) {
        where.role = role
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                applications: true,
                parentLinks: true,
                childLinks: true,
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ])

      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error('Users fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withAdminRole(request, async () => {
    try {
      const body = await request.json()
      const { userId, ...updateData } = body

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        )
      }

      const validatedData = updateUserSchema.parse(updateData)

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
