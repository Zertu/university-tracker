import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ApplicationService } from '@/lib/services/application';
import { UpdateApplicationSchema } from '@/lib/validations/application';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/applications/[id] - Get a specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const application = await ApplicationService.getApplicationById(
      resolvedParams.id,
      session.user.id
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(application);

  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Update a specific application
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

    // Only students can update their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can update applications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = UpdateApplicationSchema.parse(body);

    const application = await ApplicationService.updateApplication(
      resolvedParams.id,
      session.user.id,
      data
    );

    return NextResponse.json(application);
  } catch (error) {
    console.error('Error updating application:', error);
    
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

// DELETE /api/applications/[id] - Delete a specific application
export async function DELETE(
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

    // Only students can delete their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can delete applications' },
        { status: 403 }
      );
    }

    await ApplicationService.deleteApplication(
      resolvedParams.id,
      session.user.id
    );

    return NextResponse.json(
      { message: 'Application deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting application:', error);
    
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