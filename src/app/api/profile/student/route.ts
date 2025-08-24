import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withStudentRole } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const studentProfileSchema = z.object({
  graduationYear: z.number().int().min(2020).max(2030).optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  satScore: z.number().int().min(400).max(1600).optional(),
  actScore: z.number().int().min(1).max(36).optional(),
  targetCountries: z.array(z.string()).optional(),
  intendedMajors: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  return withStudentRole(request, async (req, user) => {
    try {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            }
          }
        }
      })

      return NextResponse.json({ studentProfile })
    } catch (error) {
      console.error('Student profile fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  return withStudentRole(request, async (req, user) => {
    try {
      const body = await request.json()
      const validatedFields = studentProfileSchema.parse(body)

      // Check if profile already exists
      const existingProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id }
      })

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Student profile already exists' },
          { status: 400 }
        )
      }

      const studentProfile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          graduationYear: validatedFields.graduationYear,
          gpa: validatedFields.gpa,
          satScore: validatedFields.satScore,
          actScore: validatedFields.actScore,
          targetCountries: validatedFields.targetCountries ? JSON.stringify(validatedFields.targetCountries) : null,
          intendedMajors: validatedFields.intendedMajors ? JSON.stringify(validatedFields.intendedMajors) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            }
          }
        }
      })

      return NextResponse.json(
        { 
          message: 'Student profile created successfully',
          studentProfile 
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Student profile creation error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

export async function PUT(request: NextRequest) {
  return withStudentRole(request, async (req, user) => {
    try {
      const body = await request.json()
      const validatedFields = studentProfileSchema.parse(body)

      const studentProfile = await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          graduationYear: validatedFields.graduationYear,
          gpa: validatedFields.gpa,
          satScore: validatedFields.satScore,
          actScore: validatedFields.actScore,
          targetCountries: validatedFields.targetCountries ? JSON.stringify(validatedFields.targetCountries) : null,
          intendedMajors: validatedFields.intendedMajors ? JSON.stringify(validatedFields.intendedMajors) : null,
        },
        create: {
          userId: user.id,
          graduationYear: validatedFields.graduationYear,
          gpa: validatedFields.gpa,
          satScore: validatedFields.satScore,
          actScore: validatedFields.actScore,
          targetCountries: validatedFields.targetCountries ? JSON.stringify(validatedFields.targetCountries) : null,
          intendedMajors: validatedFields.intendedMajors ? JSON.stringify(validatedFields.intendedMajors) : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            }
          }
        }
      })

      return NextResponse.json({ 
        message: 'Student profile updated successfully',
        studentProfile 
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.issues },
          { status: 400 }
        )
      }

      console.error('Student profile update error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}
