import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withParentRole } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withParentRole(request, async (req, user) => {
    try {
      const children = await prisma.parentChildLink.findMany({
        where: {
          parentId: user.id,
        },
        include: {
          child: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
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
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return Response.json({ children })
    } catch (error) {
      console.error('Error fetching children:', error)
      return Response.json(
        { error: 'Failed to fetch children' },
        { status: 500 }
      )
    }
  })
}