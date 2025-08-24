import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for teacher note
const TeacherNoteSchema = z.object({
  note: z.string().min(1, 'Note is required').max(2000, 'Note too long'),
});

// GET /api/teacher/notes - Get teacher's notes for a specific application
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Verify that the teacher has access to this application through their students
    const hasAccess = await prisma.teacherStudentLink.findFirst({
      where: {
        teacherId: session.user.id,
        student: {
          applications: {
            some: {
              id: applicationId,
            },
          },
        },
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this application' }, { status: 403 });
    }

    const notes = await prisma.teacherNote.findMany({
      where: {
        applicationId: applicationId,
        teacherId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching teacher notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teacher/notes - Add a new teacher note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'teacher') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const data = TeacherNoteSchema.parse(body);

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Verify that the teacher has access to this application through their students
    const hasAccess = await prisma.teacherStudentLink.findFirst({
      where: {
        teacherId: session.user.id,
        student: {
          applications: {
            some: {
              id: applicationId,
            },
          },
        },
      },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this application' }, { status: 403 });
    }

    const note = await prisma.teacherNote.create({
      data: {
        teacherId: session.user.id,
        applicationId: applicationId,
        note: data.note,
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error creating teacher note:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
