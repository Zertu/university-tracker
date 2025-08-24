import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { RequirementsService } from '@/lib/services/requirements';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/applications/requirements/[id]/notes - Add note to requirement
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const resolvedParams = await params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can add notes to their requirements
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can add notes to requirements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { note } = z.object({
      note: z.string().min(1, 'Note cannot be empty').max(1000, 'Note too long')
    }).parse(body);

    await RequirementsService.addRequirementNote(
      resolvedParams.id,
      session.user.id,
      note
    );

    return NextResponse.json(
      { message: 'Note added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding requirement note:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}