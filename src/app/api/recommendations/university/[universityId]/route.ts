import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RecommendationService } from '@/lib/services/recommendation';

// GET /api/recommendations/university/[universityId] - Get recommendation for specific university
export async function GET(
  request: NextRequest,
  { params }: { params: { universityId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can get recommendations' }, { status: 403 });
    }

    const recommendation = await RecommendationService.getUniversityRecommendation(
      session.user.id,
      params.universityId
    );

    if (!recommendation) {
      return NextResponse.json(
        { error: 'University not found or recommendation not available' },
        { status: 404 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Error fetching university recommendation:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('profile not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}