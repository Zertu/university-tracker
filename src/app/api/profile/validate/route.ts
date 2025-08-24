import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ProfileService } from '@/lib/services/profile';

// GET /api/profile/validate - Validate profile data integrity
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can validate academic profiles' }, { status: 403 });
    }

    const validation = await ProfileService.validateProfileIntegrity(session.user.id);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
