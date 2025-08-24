import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { RequirementsService } from '@/lib/services/requirements';

// GET /api/requirements/overdue - Get overdue requirements for the current user
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

    const requirements = await RequirementsService.getOverdueRequirements(
      session.user.id
    );

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error fetching overdue requirements:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
