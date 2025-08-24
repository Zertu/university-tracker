import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationService } from '@/lib/services/application';
import { CreateApplicationRequirementSchema } from '@/lib/validations/application';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/applications/[id]/requirements - Get all requirements for an application
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

    const requirements = await ApplicationService.getRequirementsByApplication(
      resolvedParams.id,
      session.user.id
    );

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('Error fetching requirements:', error);
    
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

// POST /api/applications/[id]/requirements - Create a new requirement for an application
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

    // Only students can create requirements for their applications
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can create requirements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = CreateApplicationRequirementSchema.parse(body);

    const requirement = await ApplicationService.createRequirement(
      resolvedParams.id,
      session.user.id,
      data
    );

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error('Error creating requirement:', error);
    
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