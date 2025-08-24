import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationStatusService } from '@/lib/services/application-status';
import { z } from 'zod';

const QuerySchema = z.object({
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)).optional().default(() => 10)
});

// GET /api/applications/recent-status-changes - Get recent status changes for a student
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Students and parents can view recent status changes
    if (session.user.role !== 'student' && session.user.role !== 'parent') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { limit } = QuerySchema.parse({
      limit: searchParams.get('limit')
    });

    const studentId = session.user.id;

    // Get recent status changes
    const recentChanges = await ApplicationStatusService.getRecentStatusChanges(
      studentId,
      limit
    );

    // Enhance with status info
    const enhancedChanges = recentChanges.map(change => ({
      ...change,
      fromStatusInfo: change.fromStatus ? 
        ApplicationStatusService.getStatusInfo(change.fromStatus as any) : null,
      toStatusInfo: ApplicationStatusService.getStatusInfo(change.toStatus as any)
    }));

    return NextResponse.json({
      changes: enhancedChanges,
      total: enhancedChanges.length
    });
  } catch (error) {
    console.error('Error fetching recent status changes:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
