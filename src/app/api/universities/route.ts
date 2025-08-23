import { NextRequest, NextResponse } from 'next/server';
import { searchUniversities, getLocationOptions, getPopularMajors } from '@/lib/services/university';
import { validateUniversitySearch } from '@/lib/validations/university';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Handle special endpoints
    if (searchParams.get('action') === 'locations') {
      const locations = await getLocationOptions();
      return NextResponse.json(locations);
    }
    
    if (searchParams.get('action') === 'majors') {
      const limit = parseInt(searchParams.get('limit') || '20');
      const majors = await getPopularMajors(limit);
      return NextResponse.json(majors);
    }

    // Parse search parameters
    const searchInput = {
      query: searchParams.get('query') || undefined,
      country: searchParams.get('country') || undefined,
      state: searchParams.get('state') || undefined,
      city: searchParams.get('city') || undefined,
      applicationSystem: searchParams.get('applicationSystem') as any || undefined,
      minAcceptanceRate: searchParams.get('minAcceptanceRate') ? parseFloat(searchParams.get('minAcceptanceRate')!) : undefined,
      maxAcceptanceRate: searchParams.get('maxAcceptanceRate') ? parseFloat(searchParams.get('maxAcceptanceRate')!) : undefined,
      minRanking: searchParams.get('minRanking') ? parseInt(searchParams.get('minRanking')!) : undefined,
      maxRanking: searchParams.get('maxRanking') ? parseInt(searchParams.get('maxRanking')!) : undefined,
      maxTuition: searchParams.get('maxTuition') ? parseFloat(searchParams.get('maxTuition')!) : undefined,
      majors: searchParams.get('majors') ? searchParams.get('majors')!.split(',') : undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    // Validate input
    const validatedInput = validateUniversitySearch(searchInput);

    // Search universities
    const result = await searchUniversities(validatedInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error('University search error:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}