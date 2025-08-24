import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/teacher/dashboard - Get teacher dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all students the teacher is advising (simplified query)
    const students = await prisma.teacherStudentLink.findMany({
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
                applicationType: true,
                deadline: true,
                university: {
                  select: {
                    name: true,
                    country: true,
                  },
                },
                requirements: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate dashboard statistics
    const totalStudents = students.length;
    const totalApplications = students.reduce((sum: number, student: any) => 
      sum + student.student.applications.length, 0
    );
    
    const submittedApplications = students.reduce((sum: number, student: any) => 
      sum + student.student.applications.filter((app: any) => app.status === 'submitted').length, 0
    );
    
    const pendingApplications = students.reduce((sum: number, student: any) => 
      sum + student.student.applications.filter((app: any) => 
        ['not_started', 'in_progress'].includes(app.status)
      ).length, 0
    );

    // Get recent teacher notes (simplified)
    const recentNotes = await prisma.teacherNote.findMany({
      where: {
        teacherId: session.user.id,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      students,
      statistics: {
        totalStudents,
        totalApplications,
        submittedApplications,
        pendingApplications,
      },
      recentNotes,
    });
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
