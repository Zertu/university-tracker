import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch applications with their requirements and university info
    const applications = await prisma.application.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        university: {
          select: {
            name: true,
          },
        },
        requirements: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Calculate progress for each application
    const applicationsWithProgress = applications.map((app) => {
      const totalRequirements = app.requirements.length;
      const completedRequirements = app.requirements.filter(
        (req) => req.status === 'completed'
      ).length;

      // Calculate overall progress based on status and requirements
      let progress = 0;
      if (totalRequirements > 0) {
        const requirementProgress = (completedRequirements / totalRequirements) * 80; // 80% for requirements
        const statusProgress = getStatusProgress(app.status); // 20% for status
        progress = Math.round(requirementProgress + statusProgress);
      } else {
        progress = getStatusProgress(app.status) * 5; // If no requirements, base on status only
      }

      // Calculate days until deadline
      const now = new Date();
      const deadline = new Date(app.deadline);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Determine if urgent (less than 7 days and not submitted)
      const isUrgent = daysUntilDeadline <= 7 && 
                      daysUntilDeadline >= 0 && 
                      !['submitted', 'under_review', 'decided'].includes(app.status);

      return {
        id: app.id,
        universityName: app.university.name,
        applicationType: app.applicationType,
        status: app.status,
        deadline: app.deadline.toISOString(),
        progress,
        requirementsCompleted: completedRequirements,
        requirementsTotal: totalRequirements,
        daysUntilDeadline,
        isUrgent,
      };
    });

    return NextResponse.json(applicationsWithProgress);
  } catch (error) {
    console.error('Error fetching application progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getStatusProgress(status: string): number {
  switch (status) {
    case 'not_started': return 0;
    case 'in_progress': return 10;
    case 'submitted': return 15;
    case 'under_review': return 18;
    case 'decided': return 20;
    default: return 0;
  }
}