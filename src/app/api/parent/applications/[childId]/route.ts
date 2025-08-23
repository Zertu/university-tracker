import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, validateUserAccess } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { childId: string } }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { childId } = params

      // Validate that the parent has access to this child's data
      const hasAccess = await validateUserAccess(childId, user)
      if (!hasAccess) {
        return Response.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      const applications = await prisma.application.findMany({
        where: {
          studentId: childId,
        },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              country: true,
              state: true,
              city: true,
              usNewsRanking: true,
              acceptanceRate: true,
              applicationSystem: true,
              tuitionInState: true,
              tuitionOutState: true,
              applicationFee: true,
              websiteUrl: true,
            },
          },
          requirements: {
            select: {
              id: true,
              requirementType: true,
              title: true,
              status: true,
              deadline: true,
            },
          },
          parentNotes: {
            where: {
              parentId: user.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
        orderBy: {
          deadline: 'asc',
        },
      })

      // Calculate progress for each application
      const applicationsWithProgress = applications.map(app => {
        const totalRequirements = app.requirements.length
        const completedRequirements = app.requirements.filter(
          req => req.status === 'completed'
        ).length
        
        const progress = totalRequirements > 0 
          ? Math.round((completedRequirements / totalRequirements) * 100)
          : 0

        return {
          ...app,
          progress,
          totalRequirements,
          completedRequirements,
        }
      })

      return Response.json({ applications: applicationsWithProgress })
    } catch (error) {
      console.error('Error fetching child applications:', error)
      return Response.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }
  })
}