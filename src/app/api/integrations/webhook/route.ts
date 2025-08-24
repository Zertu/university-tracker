/**
 * API route for handling webhooks from all integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { IntegrationManager } from '@/lib/integrations/manager';

/**
 * POST /api/integrations/webhook?provider=<integration_name>
 * Handle incoming webhooks from third-party integrations
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    // Get request headers and body
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = await request.text();
    let payload: any;

    try {
      payload = JSON.parse(body);
    } catch (error) {
      // Some webhooks might send non-JSON data
      payload = body;
    }

    // Handle webhook through integration manager
    const manager = IntegrationManager.getInstance();
    const result = await manager.handleWebhook(provider, payload, headers);

    if (!result.success) {
      console.error(`Webhook processing failed for ${provider}:`, result.error);
      return NextResponse.json(
        { error: result.error || 'Webhook processing failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      processed: result.processed
    });

  } catch (error) {
    console.error('Webhook API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/integrations/webhook
 * Health check endpoint for webhook URL validation
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');

  return NextResponse.json({
    message: 'Webhook endpoint is active',
    provider: provider || 'all',
    timestamp: new Date().toISOString()
  });
}
