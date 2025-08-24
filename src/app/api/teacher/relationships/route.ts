import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/teacher/relationships - Get teacher's student relationships
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const relationships = await prisma.teacherStudentLink.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
                    student: {
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
                  },
                },
                applications: {
                  select: {
                    id: true,
                    status: true,
                    university: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ relationships });
  } catch (error) {
    console.error('Error fetching teacher relationships:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
