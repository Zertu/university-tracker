import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, validateUserAccess } from '@/lib/auth'
import { z } from 'zod'

const prisma = new PrismaClient()

const createNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(2000, 'Note is too long'),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const resolvedParams = await params
      const { applicationId } = resolvedParams

      // Get the application to check if parent has access to the student
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { studentId: true },
      })

      if (!application) {
        return Response.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }

      // Validate that the parent has access to this student's data
      const hasAccess = await validateUserAccess(application.studentId, user)
      if (!hasAccess) {
        return Response.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      const notes = await prisma.parentNote.findMany({
        where: {
          applicationId,
          parentId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return Response.json({ notes })
    } catch (error) {
      console.error('Error fetching parent notes:', error)
      return Response.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      )
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const resolvedParams = await params
      const { applicationId } = resolvedParams
      const body = await request.json()
      
      // Validate input
      const validatedData = createNoteSchema.parse(body)

      // Get the application to check if parent has access to the student
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { studentId: true },
      })

      if (!application) {
        return Response.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }

      // Validate that the parent has access to this student's data
      const hasAccess = await validateUserAccess(application.studentId, user)
      if (!hasAccess) {
        return Response.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      const note = await prisma.parentNote.create({
        data: {
          parentId: user.id,
          applicationId,
          note: validatedData.note,
        },
      })

      return Response.json({ note }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          { error: 'Invalid input', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Error creating parent note:', error)
      return Response.json(
        { error: 'Failed to create note' },
        { status: 500 }
      )
    }
  })
}

