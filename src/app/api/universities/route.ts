import { NextRequest, NextResponse } from 'next/server';
import { searchUniversities } from '@/lib/services/university';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const country = searchParams.get('country') || '';
    const applicationSystem = searchParams.get('applicationSystem') || '';
    const major = searchParams.get('major') || '';

    const filters = {
      limit,
      offset,
      search,
      country,
      applicationSystem,
      major,
    };

    const result = await searchUniversities(filters as any);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching universities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch universities' },
      { status: 500 }
    );
  }
}
