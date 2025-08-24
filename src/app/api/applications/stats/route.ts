import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationService } from '@/lib/services/application';

// GET /api/applications/stats - Get application statistics for the current student
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can access their application statistics
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can access application statistics' },
        { status: 403 }
      );
    }

    const stats = await ApplicationService.getApplicationStats(session.user.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching application statistics:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
