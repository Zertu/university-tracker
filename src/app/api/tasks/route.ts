import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
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
    const showCompleted = searchParams.get('showCompleted') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const now = new Date();
    const tasks: any[] = [];

    // Get application deadlines as tasks
    const applications = await prisma.application.findMany({
      where: {
        studentId: session.user.id,
        ...(showCompleted ? {} : {
          status: {
            notIn: ['submitted', 'under_review', 'decided']
          }
        })
      },
      include: {
        university: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    // Convert applications to tasks
    applications.forEach(app => {
      const daysUntil = Math.ceil((new Date(app.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntil < 0;
      
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (isOverdue || daysUntil <= 1) {
        priority = 'critical';
      } else if (daysUntil <= 3) {
        priority = 'high';
      } else if (daysUntil <= 7) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      tasks.push({
        id: app.id,
        title: `Submit ${app.university.name} Application`,
        description: `Complete and submit your ${getApplicationTypeLabel(app.applicationType)} application`,
        type: 'application',
        priority,
        dueDate: app.deadline.toISOString(),
        daysUntil,
        applicationId: app.id,
        universityName: app.university.name,
        status: ['submitted', 'under_review', 'decided'].includes(app.status) ? 'completed' : 'pending',
        isOverdue
      });
    });

    // Get application requirements as tasks
    const requirements = await prisma.applicationRequirement.findMany({
      where: {
        application: {
          studentId: session.user.id
        },
        ...(showCompleted ? {} : {
          status: {
            not: 'completed'
          }
        }),
        deadline: {
          not: null
        }
      },
      include: {
        application: {
          include: {
            university: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        deadline: 'asc'
      }
    });

    // Convert requirements to tasks
    requirements.forEach(req => {
      if (req.deadline) {
        const daysUntil = Math.ceil((new Date(req.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntil < 0;
        
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (isOverdue || daysUntil <= 1) {
          priority = 'critical';
        } else if (daysUntil <= 3) {
          priority = 'high';
        } else if (daysUntil <= 7) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        tasks.push({
          id: req.id,
          title: req.title,
          description: req.description || `Complete ${req.title} for ${req.application.university.name}`,
          type: 'requirement',
          priority,
          dueDate: req.deadline.toISOString(),
          daysUntil,
          applicationId: req.applicationId,
          requirementId: req.id,
          universityName: req.application.university.name,
          status: req.status === 'completed' ? 'completed' : 'pending',
          isOverdue
        });
      }
    });

    // Sort tasks by priority and due date
    const sortedTasks = tasks
      .sort((a, b) => {
        // First sort by completion status (incomplete first)
        if (a.status !== b.status) {
          return a.status === 'completed' ? 1 : -1;
        }
        
        // Then by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Finally by due date
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, limit);

    return NextResponse.json(sortedTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getApplicationTypeLabel(type: string): string {
  switch (type) {
    case 'early_decision': return 'Early Decision';
    case 'early_action': return 'Early Action';
    case 'regular': return 'Regular Decision';
    case 'rolling': return 'Rolling Admission';
    default: return type;
  }
}
