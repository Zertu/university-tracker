/**
 * CommonApp integration implementation
 */

import { AbstractIntegration } from '../base/integration';
import { CommonAppAuth } from './auth';
import { CommonAppClient } from './client';
import { CommonAppSyncService } from './sync-service';
import { CommonAppWebhookHandler } from './webhook-handler';
import { IntegrationDbUtils } from '../utils';
import type { 
  AuthResult, 
  SyncResult, 
  SyncOptions, 
  WebhookResult, 
  IntegrationStatus,
  IntegrationConfig,
  IntegrationFeature
} from '../base/integration';
import type { 
  CommonAppOAuthConfig, 
  CommonAppClientConfig,
  CommonAppSyncData 
} from './types';

export class CommonAppIntegration extends AbstractIntegration {
  readonly name = 'commonapp';
  readonly displayName = 'Common Application';
  readonly description = 'Sync applications with the Common Application platform';
  readonly supportedFeatures: IntegrationFeature[] = [
    'oauth_authentication',
    'application_sync',
    'status_updates',
    'webhook_support',
    'bidirectional_sync'
  ];

  private auth: CommonAppAuth;
  private client: CommonAppClient;
  private webhookHandler: CommonAppWebhookHandler;

  constructor(config: IntegrationConfig) {
    super(config);

    // Initialize OAuth configuration
    const oauthConfig: CommonAppOAuthConfig = {
      clientId: config.clientId!,
      clientSecret: config.clientSecret!,
      redirectUri: config.redirectUri!,
      scopes: config.scopes || ['read:applications', 'write:applications', 'read:profile'],
      authUrl: `${config.apiBaseUrl}/oauth/authorize`,
      tokenUrl: `${config.apiBaseUrl}/oauth/token`
    };

    // Initialize client configuration
    const clientConfig: CommonAppClientConfig = {
      baseUrl: config.apiBaseUrl || 'https://api.commonapp.org',
      apiVersion: 'v1',
      timeout: 30000,
      retryAttempts: 3,
      rateLimits: config.rateLimits || {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      }
    };

    this.auth = new CommonAppAuth(oauthConfig);
    this.client = new CommonAppClient(clientConfig, this.auth);
    this.webhookHandler = new CommonAppWebhookHandler(config.webhookSecret || '');
  }

  /**
   * Authenticate user with CommonApp
   */
  async authenticate(userId: string): Promise<AuthResult> {
    try {
      // Check if user is already authenticated
      const existingIntegration = await IntegrationDbUtils.getIntegration(userId, this.name);
      if (existingIntegration) {
        // Validate existing token
        const isValid = await this.validateExistingToken(userId);
        if (isValid) {
          return { success: true };
        }
      }

      // Generate authorization URL
      const authUrl = this.auth.getAuthorizationUrl(userId);
      
      return {
        success: true,
        redirectUrl: authUrl
      };

    } catch (error) {
      console.error('CommonApp authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Handle OAuth callback and complete authentication
   */
  async handleOAuthCallback(code: string, state: string): Promise<AuthResult> {
    try {
      const { tokens, user } = await this.auth.exchangeCodeForToken(code, state);
      await this.auth.storeTokens(state, tokens, user);

      return { success: true };
    } catch (error) {
      console.error('OAuth callback handling failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth callback failed'
      };
    }
  }

  /**
   * Sync data with CommonApp
   */
  async sync(userId: string, options?: SyncOptions): Promise<SyncResult> {
    try {
      const syncService = new CommonAppSyncService(userId, this.client);
      return await syncService.sync(options);
    } catch (error) {
      console.error('CommonApp sync failed:', error);
      return {
        success: false,
        syncedCount: 0,
        errorCount: 1,
        errors: [this.handleError(error, 'sync')],
        lastSyncAt: new Date()
      };
    }
  }

  /**
   * Handle incoming webhooks
   */
  async handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult> {
    try {
      return await this.webhookHandler.handleWebhook(payload, headers);
    } catch (error) {
      console.error('CommonApp webhook handling failed:', error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Webhook handling failed'
      };
    }
  }

  /**
   * Disconnect user from CommonApp
   */
  async disconnect(userId: string): Promise<void> {
    try {
      // Get current integration
      const integration = await IntegrationDbUtils.getIntegration(userId, this.name);
      if (!integration) {
        return; // Already disconnected
      }

      // Revoke tokens with CommonApp
      try {
        const accessToken = await this.auth.getValidAccessToken(userId);
        await this.auth.revokeToken(accessToken);
      } catch (error) {
        console.warn('Failed to revoke CommonApp tokens:', error);
        // Continue with disconnection even if revocation fails
      }

      // Delete integration and mappings from database
      await IntegrationDbUtils.deleteIntegration(userId, this.name);

    } catch (error) {
      console.error('CommonApp disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get integration status
   */
  async getStatus(userId: string): Promise<IntegrationStatus> {
    try {
      const integration = await IntegrationDbUtils.getIntegration(userId, this.name);
      
      if (!integration) {
        return {
          connected: false,
          syncEnabled: false,
          errorCount: 0
        };
      }

      // Parse integration data
      const syncData = this.parseSyncData(integration.integrationData);
      
      // Check token validity
      const tokenValid = await this.validateExistingToken(userId);
      
      return {
        connected: tokenValid,
        lastSyncAt: integration.lastSyncAt || undefined,
        syncEnabled: integration.syncEnabled,
        errorCount: syncData.errorCount || 0,
        lastError: syncData.lastError
      };

    } catch (error) {
      console.error('Failed to get CommonApp status:', error);
      return {
        connected: false,
        syncEnabled: false,
        errorCount: 1,
        lastError: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    return this.webhookHandler['validateSignature'](payload, signature);
  }

  // Private helper methods

  private async validateExistingToken(userId: string): Promise<boolean> {
    try {
      const accessToken = await this.auth.getValidAccessToken(userId);
      return await this.auth.validateToken(accessToken);
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  private parseSyncData(integrationData: string | null): CommonAppSyncData {
    if (!integrationData) {
      return {
        syncedApplications: [],
        errorCount: 0
      };
    }

    try {
      const data = JSON.parse(integrationData);
      return {
        lastSyncAt: data.lastSyncAt,
        syncedApplications: data.syncedApplications || [],
        errorCount: data.errorCount || 0,
        lastError: data.lastError,
        webhookSecret: data.webhookSecret
      };
    } catch (error) {
      console.error('Failed to parse CommonApp sync data:', error);
      return {
        syncedApplications: [],
        errorCount: 0
      };
    }
  }

  /**
   * Update sync data in integration record
   */
  async updateSyncData(userId: string, updates: Partial<CommonAppSyncData>): Promise<void> {
    try {
      const integration = await IntegrationDbUtils.getIntegration(userId, this.name);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const currentData = this.parseSyncData(integration.integrationData);
      const updatedData = { ...currentData, ...updates };

      await IntegrationDbUtils.upsertIntegration({
        userId,
        provider: this.name,
        externalUserId: integration.externalUserId,
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
        tokenExpiresAt: integration.tokenExpiresAt,
        integrationData: updatedData
      });

    } catch (error) {
      console.error('Failed to update CommonApp sync data:', error);
      throw error;
    }
  }
}