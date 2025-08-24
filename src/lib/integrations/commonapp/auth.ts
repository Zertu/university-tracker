/**
 * CommonApp OAuth 2.0 authentication implementation
 */

import { IntegrationDbUtils, TokenUtils } from '../utils';
import type { CommonAppOAuthConfig, CommonAppTokenResponse, CommonAppUser } from './types';

export class CommonAppAuth {
  private config: CommonAppOAuthConfig;

  constructor(config: CommonAppOAuthConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(userId: string, state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state: state || userId
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<{
    tokens: CommonAppTokenResponse;
    user: CommonAppUser;
  }> {
    try {
      // Exchange code for tokens
      const tokenResponse = await this.requestAccessToken(code);
      
      // Get user information
      const user = await this.getUserInfo(tokenResponse.access_token);

      return {
        tokens: tokenResponse,
        user
      };
    } catch (error) {
      console.error('CommonApp token exchange failed:', error);
      throw new Error('Failed to authenticate with CommonApp');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<CommonAppTokenResponse> {
    try {
      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CommonApp token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.authUrl.replace('/oauth/authorize', '/oauth/token/info')}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      await fetch(`${this.config.authUrl.replace('/oauth/authorize', '/oauth/revoke')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token'
        })
      });
    } catch (error) {
      console.error('Token revocation failed:', error);
      // Don't throw - revocation failure shouldn't block disconnection
    }
  }

  /**
   * Get user information from CommonApp
   */
  async getUserInfo(accessToken: string): Promise<CommonAppUser> {
    const response = await fetch(`${this.config.authUrl.replace('/oauth/authorize', '/api/v1/user')}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get user info: ${error.error_description || error.error}`);
    }

    return await response.json();
  }

  /**
   * Store authentication tokens in database
   */
  async storeTokens(
    userId: string, 
    tokens: CommonAppTokenResponse, 
    user: CommonAppUser
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
    
    await IntegrationDbUtils.upsertIntegration({
      userId,
      provider: 'commonapp',
      externalUserId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
      integrationData: {
        userEmail: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        graduationYear: user.graduation_year,
        scopes: tokens.scope.split(' '),
        tokenType: tokens.token_type
      }
    });
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const integration = await IntegrationDbUtils.getIntegration(userId, 'commonapp');
    
    if (!integration) {
      throw new Error('CommonApp integration not found');
    }

    const accessToken = TokenUtils.decryptToken(integration.accessToken);
    
    // Check if token is expired
    if (TokenUtils.isTokenExpired(integration.tokenExpiresAt)) {
      // Refresh the token
      const refreshToken = TokenUtils.decryptToken(integration.refreshToken);
      const newTokens = await this.refreshAccessToken(refreshToken);
      
      // Update stored tokens
      const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000));
      
      await IntegrationDbUtils.upsertIntegration({
        userId,
        provider: 'commonapp',
        externalUserId: integration.externalUserId,
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
        tokenExpiresAt: expiresAt
      });

      return newTokens.access_token;
    }

    return accessToken;
  }

  private async requestAccessToken(code: string): Promise<CommonAppTokenResponse> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token request failed: ${error.error_description || error.error}`);
    }

    return await response.json();
  }
}
