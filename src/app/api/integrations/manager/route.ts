/**
 * API routes for integration manager
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { IntegrationManager } from '@/lib/integrations/manager';
import { z } from 'zod';

const syncRequestSchema = z.object({
  integrationName: z.string().optional(),
  options: z.object({
    forceSync: z.boolean().optional(),
    syncType: z.enum(['pull', 'push', 'bidirectional']).optional(),
    applicationIds: z.array(z.string()).optional()
  }).optional()
});

const toggleSyncSchema = z.object({
  integrationName: z.string(),
  enabled: z.boolean()
});

/**
 * GET /api/integrations/manager
 * Get integration summary for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manager = IntegrationManager.getInstance();
    const summary = await manager.getIntegrationSummary(session.user.id);

    return NextResponse.json({ integrations: summary });
  } catch (error) {
    console.error('Failed to get integration summary:', error);
    return NextResponse.json(
      { error: 'Failed to get integration summary' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/manager
 * Perform integration operations (sync, authenticate, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const manager = IntegrationManager.getInstance();

    switch (action) {
      case 'sync': {
        const body = await request.json();
        const { integrationName, options } = syncRequestSchema.parse(body);

        let result;
        if (integrationName) {
          // Sync specific integration
          result = await manager.syncIntegration(integrationName, session.user.id, options);
          return NextResponse.json({ [integrationName]: result });
        } else {
          // Sync all integrations
          result = await manager.syncAllIntegrations(session.user.id, options);
          return NextResponse.json(result);
        }
      }

      case 'authenticate': {
        const { integrationName } = await request.json();
        if (!integrationName) {
          return NextResponse.json({ error: 'Integration name required' }, { status: 400 });
        }

        const result = await manager.authenticate(integrationName, session.user.id);
        return NextResponse.json(result);
      }

      case 'disconnect': {
        const { integrationName } = await request.json();
        if (!integrationName) {
          return NextResponse.json({ error: 'Integration name required' }, { status: 400 });
        }

        await manager.disconnect(integrationName, session.user.id);
        return NextResponse.json({ success: true });
      }

      case 'toggle-sync': {
        const body = await request.json();
        const { integrationName, enabled } = toggleSyncSchema.parse(body);

        await manager.toggleSync(integrationName, session.user.id, enabled);
        return NextResponse.json({ success: true });
      }

      case 'status': {
        const { integrationName } = await request.json();
        if (!integrationName) {
          return NextResponse.json({ error: 'Integration name required' }, { status: 400 });
        }

        const status = await manager.getIntegrationStatus(integrationName, session.user.id);
        return NextResponse.json({ status });
      }

      case 'sync-history': {
        const limit = parseInt(searchParams.get('limit') || '10');
        const history = await manager.getSyncHistory(session.user.id, limit);
        return NextResponse.json({ history });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Integration manager API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
