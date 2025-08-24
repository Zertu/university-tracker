import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/parent/notes - Get all notes for parent
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Only parents can access notes' }, { status: 403 });
    }

    // Get all notes for this parent
    const notes = await prisma.parentNote.findMany({
      where: {
        parentId: session.user.id
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
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching parent notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/parent/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'parent') {
      return NextResponse.json({ error: 'Only parents can create notes' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, content } = body;

    if (!applicationId || !content) {
      return NextResponse.json({ error: 'Application ID and content are required' }, { status: 400 });
    }

    // Verify parent has access to this application through their child
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        student: {
          parentLinks: {
            some: {
              parentId: session.user.id
            }
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Access denied to this application' }, { status: 403 });
    }

    // Create the note
    const note = await prisma.parentNote.create({
      data: {
        parentId: session.user.id,
        applicationId: applicationId,
        content: content
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
      }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Error creating parent note:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
