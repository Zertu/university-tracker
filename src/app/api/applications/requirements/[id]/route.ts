import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationService } from '@/lib/services/application';
import { RequirementsService } from '@/lib/services/requirements';
import { UpdateApplicationRequirementSchema, RequirementStatusSchema } from '@/lib/validations/application';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT /api/applications/requirements/[id] - Update a specific requirement
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

    // Only students can update requirements for their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can update requirements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = UpdateApplicationRequirementSchema.parse(body);

    const requirement = await ApplicationService.updateRequirement(
      resolvedParams.id,
      session.user.id,
      data
    );

    return NextResponse.json(requirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    
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

// PATCH /api/applications/requirements/[id]/status - Update requirement status
export async function PATCH(
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

    // Only students can update requirement status
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can update requirement status' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes } = z.object({
      status: RequirementStatusSchema,
      notes: z.string().optional()
    }).parse(body);

    await RequirementsService.updateRequirementStatus(
      resolvedParams.id,
      session.user.id,
      status,
      notes
    );

    return NextResponse.json(
      { message: 'Requirement status updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating requirement status:', error);
    
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

// DELETE /api/applications/requirements/[id] - Delete a specific requirement
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

    // Only students can delete requirements for their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can delete requirements' },
        { status: 403 }
      );
    }

    await ApplicationService.deleteRequirement(
      resolvedParams.id,
      session.user.id
    );

    return NextResponse.json(
      { message: 'Requirement deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting requirement:', error);
    
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