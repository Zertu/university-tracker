import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, ParentChildLink } from '@prisma/client'
import { withAuth } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const linkRequestSchema = z.object({
  childEmail: z.string().email('Invalid email address'),
  relationshipType: z.enum(['parent', 'guardian']).default('parent'),
})

// Get all relationships for the current user
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      let relationships: ParentChildLink[] = []

      if (user.role === 'parent') {
        // Get children linked to this parent
        relationships = await prisma.parentChildLink.findMany({
          where: { parentId: user.id },
          include: {
            child: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                studentProfile: true,
              }
            }
          }
        })
      } else if (user.role === 'student') {
        // Get parents linked to this student
        relationships = await prisma.parentChildLink.findMany({
          where: { childId: user.id },
          include: {
            parent: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              }
            }
          }
        })
      }

      return NextResponse.json({ relationships })
    } catch (error) {
      console.error('Relationships fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}

// Create a new parent-child relationship
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json()
      const validatedFields = linkRequestSchema.parse(body)

      // Only parents can create relationships
      if (user.role !== 'parent') {
        return NextResponse.json(
          { error: 'Only parents can create relationships' },
          { status: 403 }
        )
      }

      // Find the child user by email
      const childUser = await prisma.user.findUnique({
        where: { email: validatedFields.childEmail },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        }
      })

      if (!childUser) {
        return NextResponse.json(
          { error: 'Student not found with this email address' },
          { status: 404 }
        )
      }

      if (childUser.role !== 'student') {
        return NextResponse.json(
          { error: 'User is not a student' },
          { status: 400 }
        )
      }

      // Check if relationship already exists
      const existingLink = await prisma.parentChildLink.findUnique({
        where: {
          parentId_childId: {
            parentId: user.id,
            childId: childUser.id,
          }
        }
      })

      if (existingLink) {
        return NextResponse.json(
          { error: 'Relationship already exists' },
          { status: 400 }
        )
      }

      // Create the relationship
      const relationship = await prisma.parentChildLink.create({
        data: {
          parentId: user.id,
          childId: childUser.id,
          relationshipType: validatedFields.relationshipType,
        },
        include: {
          child: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              studentProfile: true,
            }
          },
          parent: {
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
          message: 'Relationship created successfully',
          relationship 
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Relationship creation error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}