import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { ApplicationService } from '@/lib/services/application';
import { ApplicationStatus, ApplicationType } from '@/lib/validations/application';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as ApplicationStatus | null;
    const applicationType = searchParams.get('applicationType') as ApplicationType | null;

    // Fetch applications and stats with filters
    const [applicationsData, statsData] = await Promise.all([
      ApplicationService.getApplicationsByStudent(session.user.id, { 
        page, 
        limit,
        status: status || undefined,
        applicationType: applicationType || undefined
      }),
      ApplicationService.getApplicationStats(session.user.id)
    ]);

    return NextResponse.json({
      applications: applicationsData.applications,
      stats: statsData,
      pagination: {
        page,
        limit,
        total: applicationsData.total,
        hasMore: applicationsData.total > page * limit
      }
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
