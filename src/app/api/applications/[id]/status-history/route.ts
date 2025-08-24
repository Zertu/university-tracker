import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationService } from '@/lib/services/application';
import { ApplicationStatusService } from '@/lib/services/application-status';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/applications/[id]/status-history - Get status history for an application
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

    // Students and parents can view status history
    if (session.user.role !== 'student' && session.user.role !== 'parent') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const studentId = session.user.id;

    // Verify application exists and user has access
    const application = await ApplicationService.getApplicationById(
      resolvedParams.id,
      studentId
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get status history
    const statusHistory = await ApplicationStatusService.getStatusHistory(
      resolvedParams.id
    );

    // Enhance history with status info
    const enhancedHistory = statusHistory.map(entry => ({
      ...entry,
      fromStatusInfo: entry.fromStatus ? 
        ApplicationStatusService.getStatusInfo(entry.fromStatus as any) : null,
      toStatusInfo: ApplicationStatusService.getStatusInfo(entry.toStatus as any)
    }));

    return NextResponse.json({
      applicationId: resolvedParams.id,
      history: enhancedHistory
    });
  } catch (error) {
    console.error('Error fetching status history:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}