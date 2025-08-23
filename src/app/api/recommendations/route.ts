import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RecommendationService } from '@/lib/services/recommendation';
import { z } from 'zod';

// Query schema for recommendations
const RecommendationQuerySchema = z.object({
  countries: z.string().optional().transform(val => val ? val.split(',') : undefined),
  majors: z.string().optional().transform(val => val ? val.split(',') : undefined),
  minAcceptanceRate: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxAcceptanceRate: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  maxTuition: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  applicationSystem: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
});

// GET /api/recommendations - Get personalized university recommendations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can get recommendations' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const filters = RecommendationQuerySchema.parse(queryParams);

    const result = await RecommendationService.getRecommendations(
      session.user.id,
      filters
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }

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