import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { RequirementsService } from '@/lib/services/requirements';

// GET /api/requirements/upcoming - Get upcoming requirements for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can view their requirements
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can view requirements' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 7;

    // Validate days parameter
    if (daysAhead < 1 || daysAhead > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    const requirements = await RequirementsService.getUpcomingRequirements(
      session.user.id,
      daysAhead
    );

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error fetching upcoming requirements:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
