import { NextRequest, NextResponse } from 'next/server';
import { getUniversitiesForComparison } from '@/lib/services/university';
import { validateUniversityComparison } from '@/lib/validations/university';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedInput = validateUniversityComparison(body);

    // Get universities for comparison
    const universities = await getUniversitiesForComparison(validatedInput);

    if (universities.length !== validatedInput.universityIds.length) {
      return NextResponse.json(
        { error: 'One or more universities not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ universities });
  } catch (error) {
    console.error('University comparison error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid comparison parameters', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}