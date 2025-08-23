import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ApplicationService } from '@/lib/services/application';
import { ApplicationStatusService } from '@/lib/services/application-status';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/applications/[id]/auto-transition - Check and perform automatic status transitions
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

    // Only students can trigger auto-transitions for their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can trigger auto-transitions' },
        { status: 403 }
      );
    }

    const studentId = session.user.id;

    // Verify application exists and belongs to student
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

    // Check for auto-transition
    const transitionResult = await ApplicationStatusService.checkAutoStatusTransition(
      resolvedParams.id,
      studentId
    );

    if (transitionResult.transitioned) {
      // Get updated application
      const updatedApplication = await ApplicationService.getApplicationById(
        resolvedParams.id,
        studentId
      );

      return NextResponse.json({
        transitioned: true,
        newStatus: transitionResult.newStatus,
        application: updatedApplication,
        message: `Status automatically updated to ${transitionResult.newStatus}`
      });
    } else {
      return NextResponse.json({
        transitioned: false,
        currentStatus: application.status,
        message: 'No automatic transition available'
      });
    }
  } catch (error) {
    console.error('Error checking auto-transition:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}