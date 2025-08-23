import { NextRequest, NextResponse } from 'next/server';
import { notificationScheduler } from '@/lib/services/notification-scheduler';

export async function GET(request: NextRequest) {
  try {
    // This endpoint is designed to be called by external cron services
    // You might want to add authentication via API key or other means
    
    const { searchParams } = new URL(request.url);
    const authKey = searchParams.get('key');
    
    // Simple API key authentication (in production, use environment variable)
    if (authKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Running scheduled notification tasks via cron...');
    
    const result = await notificationScheduler.runScheduledTasks();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('Error in cron notification job:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run notification cron job',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authKey, task } = body;
    
    // Simple API key authentication
    if (authKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result;

    switch (task) {
      case 'deadline-reminders':
        result = await notificationScheduler.processDeadlineReminders();
        break;
      case 'overdue-deadlines':
        result = await notificationScheduler.processOverdueDeadlines();
        break;
      case 'cleanup':
        result = await notificationScheduler.cleanupNotifications();
        break;
      case 'all':
      default:
        result = await notificationScheduler.runScheduledTasks();
        break;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      task,
      result,
    });
  } catch (error) {
    console.error('Error in cron notification job:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run notification cron job',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}