import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProfileService } from '@/lib/services/profile';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get profile completion data using the new service
    const completion = await ProfileService.getProfileCompletion(session.user.id);
    const profile = await ProfileService.getProfileByUserId(session.user.id);

    // Parse JSON fields for response if profile exists
    let responseProfile = null;
    if (profile) {
      responseProfile = {
        ...profile,
        targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
        intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
      };
    }

    return NextResponse.json({
      isComplete: completion.completionPercentage >= 75, // Consider 75% as complete
      completion,
      profile: responseProfile,
    });
  } catch (error) {
    console.error('Error checking profile completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
