import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { RecommendationService } from '@/lib/services/recommendation';

// POST /api/recommendations/refresh - Refresh user's recommendations
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can refresh recommendations' }, { status: 403 });
    }

    await RecommendationService.refreshRecommendations(session.user.id);

    return NextResponse.json({ message: 'Recommendations refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
