import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RequirementsService } from '@/lib/services/requirements';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/applications/requirements/[id]/deadline - Set requirement deadline
export async function PUT(
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

    // Only students can set requirement deadlines
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can set requirement deadlines' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { deadline } = z.object({
      deadline: z.string().datetime().nullable()
    }).parse(body);

    await RequirementsService.setRequirementDeadline(
      resolvedParams.id,
      session.user.id,
      deadline ? new Date(deadline) : null
    );

    return NextResponse.json(
      { message: 'Requirement deadline updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error setting requirement deadline:', error);
    
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