import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withParentRole } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withParentRole(request, async (req, user) => {
    try {
      const parentProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          parentLinks: {
            include: {
              child: {
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
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!parentProfile) {
        return NextResponse.json(
          { error: 'Parent profile not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ parentProfile })
    } catch (error) {
      console.error('Parent profile fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
}