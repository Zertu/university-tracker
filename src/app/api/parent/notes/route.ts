import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, validateUserAccess } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url)
      const childId = searchParams.get('childId')

      if (!childId) {
        return Response.json(
          { error: 'Child ID is required' },
          { status: 400 }
        )
      }

      // Validate that the parent has access to this child's data
      const hasAccess = await validateUserAccess(childId, user)
      if (!hasAccess) {
        return Response.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      const notes = await prisma.parentNote.findMany({
        where: {
          parentId: user.id,
          application: {
            studentId: childId,
          },
        },
        include: {
          application: {
            include: {
              university: {
                select: {
                  name: true,
                  city: true,
                  state: true,
                  country: true,
                },
              },
            },
          },
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