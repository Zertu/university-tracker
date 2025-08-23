import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ApplicationService } from '@/lib/services/application';
import { ApplicationStatusService } from '@/lib/services/application-status';
import { ApplicationStatusSchema } from '@/lib/validations/application';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const UpdateStatusSchema = z.object({
  status: ApplicationStatusSchema,
  notes: z.string().optional()
});

// PUT /api/applications/[id]/status - Update application status
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

    // Only students can update their application status
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can update application status' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes } = UpdateStatusSchema.parse(body);

    // Get current application to validate transition
    const currentApplication = await ApplicationService.getApplicationById(
      resolvedParams.id,
      session.user.id
    );

    if (!currentApplication) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Validate status transition
    const validation = ApplicationStatusService.validateStatusTransition(
      currentApplication.status as any,
      status
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Update application status
    const updatedApplication = await ApplicationService.updateApplication(
      resolvedParams.id,
      session.user.id,
      { status, notes }
    );

    return NextResponse.json({
      application: updatedApplication,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Invalid status transition')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id]/status - Get status information and next possible statuses
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

    // Students and parents can view status information
    if (session.user.role !== 'student' && session.user.role !== 'parent') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const studentId = session.user.id;

    // Get application
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

    const currentStatus = application.status as any;
    const statusInfo = ApplicationStatusService.getStatusInfo(currentStatus);
    const nextPossibleStatuses = ApplicationStatusService.getNextPossibleStatuses(currentStatus);

    return NextResponse.json({
      currentStatus,
      statusInfo,
      nextPossibleStatuses: nextPossibleStatuses.map(status => ({
        status,
        info: ApplicationStatusService.getStatusInfo(status)
      }))
    });
  } catch (error) {
    console.error('Error fetching application status:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}