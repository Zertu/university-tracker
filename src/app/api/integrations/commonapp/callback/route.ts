/**
 * CommonApp OAuth callback handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { IntegrationManager } from '@/lib/integrations/manager';
import { CommonAppIntegration } from '@/lib/integrations/commonapp';

/**
 * GET /api/integrations/commonapp/callback
 * Handle OAuth callback from CommonApp
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      const errorDescription = searchParams.get('error_description') || 'OAuth authorization failed';
      console.error('CommonApp OAuth error:', error, errorDescription);
      
      return NextResponse.redirect(
        new URL(`/dashboard?error=commonapp_auth_failed&message=${encodeURIComponent(errorDescription)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_callback&message=Missing authorization code or state', request.url)
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=invalid_session&message=Invalid user session', request.url)
      );
    }

    // Get CommonApp integration from manager
    const manager = IntegrationManager.getInstance();
    const integration = manager.getIntegration('commonapp') as CommonAppIntegration;
    
    if (!integration) {
      return NextResponse.redirect(
        new URL('/dashboard?error=integration_not_found&message=CommonApp integration not available', request.url)
      );
    }

    // Handle OAuth callback
    const result = await integration.handleOAuthCallback(code, state);
    
    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=auth_failed&message=${encodeURIComponent(result.error || 'Authentication failed')}`, request.url)
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/dashboard?success=commonapp_connected&message=CommonApp successfully connected', request.url)
    );

  } catch (error) {
    console.error('CommonApp callback error:', error);
    
    return NextResponse.redirect(
      new URL('/dashboard?error=callback_error&message=An unexpected error occurred', request.url)
    );
  }
}
