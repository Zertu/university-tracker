import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { RecommendationService } from '@/lib/services/recommendation';
import { z } from 'zod';

// Category schema
const CategorySchema = z.enum(['reach', 'target', 'safety']);

// Query schema
const CategoryQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});

// GET /api/recommendations/category/[category] - Get recommendations by category
export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can get recommendations' }, { status: 403 });
    }

    // Validate category
    const category = CategorySchema.parse(params.category);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const { limit } = CategoryQuerySchema.parse(queryParams);

    const recommendations = await RecommendationService.getRecommendationsByCategory(
      session.user.id,
      category,
      limit
    );

    return NextResponse.json({
      category,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Error fetching recommendations by category:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.issues },
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