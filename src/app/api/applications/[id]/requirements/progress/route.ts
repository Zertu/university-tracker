import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RequirementsService } from '@/lib/services/requirements';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/applications/[id]/requirements/progress - Get requirement progress tracking data
export async function GET(
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

    const progress = await RequirementsService.getRequirementProgress(
      resolvedParams.id,
      session.user.id
    );

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching requirement progress:', error);
    
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