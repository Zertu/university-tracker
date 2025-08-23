import { NextRequest, NextResponse } from 'next/server';
import { notificationScheduler } from '@/lib/services/notification-scheduler';

export async function POST(request: NextRequest) {
  try {
    // This endpoint would typically be called by a cron job or scheduled task
    // For security, you might want to add authentication or API key validation
    
    const body = await request.json();
    const { task } = body;

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
        result = await notificationScheduler.runScheduledTasks();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid task. Valid tasks: deadline-reminders, overdue-deadlines, cleanup, all' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      task,
      result 
    });
  } catch (error) {
    console.error('Error running notification scheduler:', error);
    return NextResponse.json(
      { error: 'Failed to run notification scheduler' },
      { status: 500 }
    );
  }
}