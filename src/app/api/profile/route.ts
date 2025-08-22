import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          studentProfile: true,
        }
      })

      if (!userProfile) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ user: userProfile })
    } catch (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json()
      const validatedFields = updateProfileSchema.parse(body)

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: validatedFields,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        }
      })

      return NextResponse.json({ 
        message: 'Profile updated successfully',
        user: updatedUser 
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Profile update error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}