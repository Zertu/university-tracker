/**
 * API routes for sync orchestrator
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SyncOrchestrator } from '@/lib/integrations/sync';
import { z } from 'zod';

const startSyncSchema = z.object({
  provider: z.string().optional(),
  options: z.object({
    forceSync: z.boolean().optional(),
    syncType: z.enum(['pull', 'push', 'bidirectional']).optional(),
    applicationIds: z.array(z.string()).optional()
  }).optional()
});

const scheduleSyncSchema = z.object({
  cronExpression: z.string(),
  provider: z.string().optional(),
  options: z.object({
    forceSync: z.boolean().optional(),
    syncType: z.enum(['pull', 'push', 'bidirectional']).optional(),
    applicationIds: z.array(z.string()).optional()
  }).optional()
});

/**
 * POST /api/integrations/sync/orchestrator
 * Start a sync job or manage sync operations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const orchestrator = new SyncOrchestrator();

    switch (action) {
      case 'start': {
        const body = await request.json();
        const { provider, options } = startSyncSchema.parse(body);

        const job = await orchestrator.startSync(session.user.id, provider, options);
        
        return NextResponse.json({
          success: true,
          job: {
            id: job.id,
            status: job.status,
            provider: job.provider,
            createdAt: job.createdAt
          }
        });
      }

      case 'schedule': {
        const body = await request.json();
        const { cronExpression, provider, options } = scheduleSyncSchema.parse(body);

        const schedule = await orchestrator.scheduleSync(
          session.user.id,
          cronExpression,
          provider,
          options
        );
        
        return NextResponse.json({
          success: true,
          schedule: {
            id: schedule.id,
            cronExpression: schedule.cronExpression,
            provider: schedule.provider,
            enabled: schedule.enabled,
            nextRun: schedule.nextRun,
            createdAt: schedule.createdAt
          }
        });
      }

      case 'cancel': {
        const { jobId } = await request.json();
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const cancelled = await orchestrator.cancelSync(jobId);
        
        return NextResponse.json({
          success: cancelled,
          message: cancelled ? 'Job cancelled' : 'Job not found or already completed'
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Sync orchestrator API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/sync/orchestrator
 * Get sync job status, history, or statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const jobId = searchParams.get('jobId');
    const provider = searchParams.get('provider');
    const limit = parseInt(searchParams.get('limit') || '10');

    const orchestrator = new SyncOrchestrator();

    switch (action) {
      case 'status': {
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const job = await orchestrator.getJobStatus(jobId);
        
        if (!job) {
          return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json({ job });
      }

      case 'history': {
        const history = await orchestrator.getSyncHistory(
          session.user.id,
          limit,
          provider || undefined
        );
        
        return NextResponse.json({ history });
      }

      case 'stats': {
        const timeRange = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        };

        const stats = await orchestrator.getSyncStats(
          session.user.id,
          provider || undefined,
          timeRange
        );
        
        return NextResponse.json({ stats });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Sync orchestrator GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}