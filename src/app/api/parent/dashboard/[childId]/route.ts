import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, validateUserAccess } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const resolvedParams = await params
      const { childId } = resolvedParams

      // Validate that the parent has access to this child's data
      const hasAccess = await validateUserAccess(childId, user)
      if (!hasAccess) {
        return Response.json(
          { error: 'Forbidden - insufficient permissions' },
          { status: 403 }
        )
      }

      // Get child's basic info
      const child = await prisma.user.findUnique({
        where: { id: childId },
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: {
            select: {
              graduationYear: true,
              gpa: true,
              satScore: true,
              actScore: true,
              targetCountries: true,
              intendedMajors: true,
            },
          },
        },
      })

      if (!child) {
        return Response.json(
          { error: 'Child not found' },
          { status: 404 }
        )
      }

      // Get application statistics
      const applications = await prisma.application.findMany({
        where: { studentId: childId },
        include: {
          university: {
            select: {
              name: true,
              tuitionInState: true,
              tuitionOutState: true,
            },
          },
          requirements: {
            select: {
              status: true,
            },
          },
        },
      })

      // Calculate statistics
      const totalApplications = applications.length
      const submittedApplications = applications.filter(
        app => app.status === 'submitted' || app.status === 'under_review' || app.status === 'decided'
      ).length
      const acceptedApplications = applications.filter(
        app => app.decisionType === 'accepted'
      ).length
      const rejectedApplications = applications.filter(
        app => app.decisionType === 'rejected'
      ).length
      const waitlistedApplications = applications.filter(
        app => app.decisionType === 'waitlisted'
      ).length

      // Calculate upcoming deadlines (next 30 days)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      
      const upcomingDeadlines = applications.filter(
        app => app.deadline <= thirtyDaysFromNow && 
               (app.status === 'not_started' || app.status === 'in_progress')
      ).length

      // Calculate total estimated costs
      const estimatedCosts = applications.reduce((total, app) => {
        const tuition = app.university.tuitionOutState || app.university.tuitionInState || 0
        return total + tuition
      }, 0)

      // Calculate overall progress
      const allRequirements = applications.flatMap(app => app.requirements)
      const completedRequirements = allRequirements.filter(req => req.status === 'completed').length
      const overallProgress = allRequirements.length > 0 
        ? Math.round((completedRequirements / allRequirements.length) * 100)
        : 0

      // Get recent activity (status changes in last 7 days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentActivity = await prisma.applicationStatusHistory.findMany({
        where: {
          application: {
            studentId: childId,
          },
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          application: {
            include: {
              university: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      })

      return Response.json({
        child,
        statistics: {
          totalApplications,
          submittedApplications,
          acceptedApplications,
          rejectedApplications,
          waitlistedApplications,
          upcomingDeadlines,
          estimatedCosts,
          overallProgress,
        },
        recentActivity,
      })
    } catch (error) {
      console.error('Error fetching parent dashboard data:', error)
      return Response.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      )
    }
  })
}