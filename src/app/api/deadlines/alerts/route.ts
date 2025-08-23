import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DeadlineService } from '@/lib/services/deadline';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const includeRequirements = searchParams.get('includeRequirements') === 'true';

    const [applicationAlerts, requirementAlerts] = await Promise.all([
      DeadlineService.getDeadlineAlerts(session.user.id, daysAhead),
      includeRequirements 
        ? DeadlineService.getRequirementDeadlineAlerts(session.user.id, daysAhead)
        : Promise.resolve([])
    ]);

    const alerts = [...applicationAlerts, ...requirementAlerts]
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.urgencyLevel === 'critical').length,
        warning: alerts.filter(a => a.urgencyLevel === 'warning').length,
        info: alerts.filter(a => a.urgencyLevel === 'info').length
      }
    });
  } catch (error) {
    console.error('Error fetching deadline alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}