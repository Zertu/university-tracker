/**
 * API route for manual sync operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IntegrationManager } from '@/lib/integrations/manager';
import { z } from 'zod';

const syncRequestSchema = z.object({
  provider: z.string().optional(),
  options: z.object({
    forceSync: z.boolean().optional(),
    syncType: z.enum(['pull', 'push', 'bidirectional']).optional(),
    applicationIds: z.array(z.string()).optional()
  }).optional()
});

/**
 * POST /api/integrations/sync
 * Trigger manual sync for integrations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, options } = syncRequestSchema.parse(body);

    const manager = IntegrationManager.getInstance();

    if (provider) {
      // Sync specific integration
      const result = await manager.syncIntegration(provider, session.user.id, options);
      
      return NextResponse.json({
        success: result.success,
        provider,
        syncedCount: result.syncedCount,
        errorCount: result.errorCount,
        errors: result.errors,
        lastSyncAt: result.lastSyncAt
      });
    } else {
      // Sync all integrations
      const results = await manager.syncAllIntegrations(session.user.id, options);
      
      const summary = {
        success: Object.values(results).every(r => r.success),
        totalSynced: Object.values(results).reduce((sum, r) => sum + r.syncedCount, 0),
        totalErrors: Object.values(results).reduce((sum, r) => sum + r.errorCount, 0),
        results
      };

      return NextResponse.json(summary);
    }

  } catch (error) {
    console.error('Sync API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/sync
 * Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const provider = searchParams.get('provider');

    const manager = IntegrationManager.getInstance();

    if (provider) {
      // Get status for specific integration
      const status = await manager.getIntegrationStatus(provider, session.user.id);
      return NextResponse.json({ provider, status });
    } else {
      // Get sync history for all integrations
      const history = await manager.getSyncHistory(session.user.id, limit);
      return NextResponse.json({ history });
    }

  } catch (error) {
    console.error('Sync status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}