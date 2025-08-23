/**
 * Integration manager that orchestrates all third-party integrations
 */

import { prisma } from '@/lib/prisma';
import type { 
  BaseIntegration, 
  SyncResult, 
  SyncOptions, 
  WebhookResult, 
  IntegrationStatus,
  IntegrationConfig 
} from './base/integration';

export interface RegisteredIntegration {
  integration: BaseIntegration;
  config: IntegrationConfig;
}

export interface IntegrationSummary {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  connected: boolean;
  status?: IntegrationStatus;
}

/**
 * Central integration manager
 */
export class IntegrationManager {
  private integrations = new Map<string, RegisteredIntegration>();
  private static instance: IntegrationManager;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Register a new integration
   */
  registerIntegration(integration: BaseIntegration, config: IntegrationConfig): void {
    if (this.integrations.has(integration.name)) {
      throw new Error(`Integration ${integration.name} is already registered`);
    }

    this.integrations.set(integration.name, { integration, config });
    console.log(`Registered integration: ${integration.displayName}`);
  }

  /**
   * Get all registered integrations
   */
  getRegisteredIntegrations(): string[] {
    return Array.from(this.integrations.keys());
  }

  /**
   * Get integration by name
   */
  getIntegration(name: string): BaseIntegration | null {
    const registered = this.integrations.get(name);
    return registered ? registered.integration : null;
  }

  /**
   * Get integration config by name
   */
  getIntegrationConfig(name: string): IntegrationConfig | null {
    const registered = this.integrations.get(name);
    return registered ? registered.config : null;
  }

  /**
   * Get integration summary for a user
   */
  async getIntegrationSummary(userId: string): Promise<IntegrationSummary[]> {
    const summaries: IntegrationSummary[] = [];

    // Get user's connected integrations
    const userIntegrations = await prisma.integration.findMany({
      where: { userId }
    });

    const connectedIntegrations = new Map(
      userIntegrations.map(integration => [integration.provider, integration])
    );

    // Build summary for each registered integration
    for (const [name, { integration, config }] of this.integrations) {
      const userIntegration = connectedIntegrations.get(name);
      const connected = !!userIntegration;

      let status: IntegrationStatus | undefined;
      if (connected) {
        try {
          status = await integration.getStatus(userId);
        } catch (error) {
          console.error(`Failed to get status for ${name}:`, error);
          status = {
            connected: false,
            syncEnabled: false,
            errorCount: 1,
            lastError: 'Failed to get status'
          };
        }
      }

      summaries.push({
        name,
        displayName: integration.displayName,
        description: integration.description,
        enabled: config.enabled,
        connected,
        status
      });
    }

    return summaries;
  }

  /**
   * Authenticate user with a specific integration
   */
  async authenticate(integrationName: string, userId: string): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
    const integration = this.getIntegration(integrationName);
    if (!integration) {
      return { success: false, error: 'Integration not found' };
    }

    const config = this.getIntegrationConfig(integrationName);
    if (!config || !config.enabled) {
      return { success: false, error: 'Integration not enabled' };
    }

    try {
      const result = await integration.authenticate(userId);
      return result;
    } catch (error) {
      console.error(`Authentication failed for ${integrationName}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }

  /**
   * Sync data for a specific integration
   */
  async syncIntegration(integrationName: string, userId: string, options?: SyncOptions): Promise<SyncResult> {
    const integration = this.getIntegration(integrationName);
    if (!integration) {
      throw new Error(`Integration ${integrationName} not found`);
    }

    try {
      return await integration.sync(userId, options);
    } catch (error) {
      console.error(`Sync failed for ${integrationName}:`, error);
      return {
        success: false,
        syncedCount: 0,
        errorCount: 1,
        errors: [{
          type: 'data_mapping',
          message: error instanceof Error ? error.message : 'Sync failed',
          retryable: true
        }],
        lastSyncAt: new Date()
      };
    }
  }

  /**
   * Sync all connected integrations for a user
   */
  async syncAllIntegrations(userId: string, options?: SyncOptions): Promise<Record<string, SyncResult>> {
    const results: Record<string, SyncResult> = {};

    // Get user's connected integrations
    const userIntegrations = await prisma.integration.findMany({
      where: { 
        userId,
        syncEnabled: true
      }
    });

    // Sync each connected integration
    for (const userIntegration of userIntegrations) {
      try {
        const result = await this.syncIntegration(userIntegration.provider, userId, options);
        results[userIntegration.provider] = result;
      } catch (error) {
        console.error(`Failed to sync ${userIntegration.provider}:`, error);
        results[userIntegration.provider] = {
          success: false,
          syncedCount: 0,
          errorCount: 1,
          errors: [{
            type: 'data_mapping',
            message: error instanceof Error ? error.message : 'Sync failed',
            retryable: true
          }],
          lastSyncAt: new Date()
        };
      }
    }

    return results;
  }

  /**
   * Handle webhook from any integration
   */
  async handleWebhook(integrationName: string, payload: any, headers: Record<string, string>): Promise<WebhookResult> {
    const integration = this.getIntegration(integrationName);
    if (!integration) {
      return {
        success: false,
        processed: false,
        error: 'Integration not found'
      };
    }

    try {
      return await integration.handleWebhook(payload, headers);
    } catch (error) {
      console.error(`Webhook handling failed for ${integrationName}:`, error);
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Webhook handling failed'
      };
    }
  }

  /**
   * Disconnect user from a specific integration
   */
  async disconnect(integrationName: string, userId: string): Promise<void> {
    const integration = this.getIntegration(integrationName);
    if (!integration) {
      throw new Error(`Integration ${integrationName} not found`);
    }

    try {
      await integration.disconnect(userId);
    } catch (error) {
      console.error(`Disconnect failed for ${integrationName}:`, error);
      throw error;
    }
  }

  /**
   * Get status for a specific integration
   */
  async getIntegrationStatus(integrationName: string, userId: string): Promise<IntegrationStatus | null> {
    const integration = this.getIntegration(integrationName);
    if (!integration) {
      return null;
    }

    try {
      return await integration.getStatus(userId);
    } catch (error) {
      console.error(`Failed to get status for ${integrationName}:`, error);
      return {
        connected: false,
        syncEnabled: false,
        errorCount: 1,
        lastError: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Enable/disable sync for a specific integration
   */
  async toggleSync(integrationName: string, userId: string, enabled: boolean): Promise<void> {
    await prisma.integration.updateMany({
      where: {
        userId,
        provider: integrationName
      },
      data: {
        syncEnabled: enabled
      }
    });
  }

  /**
   * Get sync history for a user
   */
  async getSyncHistory(userId: string, limit: number = 10): Promise<Array<{
    provider: string;
    lastSyncAt: Date | null;
    syncEnabled: boolean;
    errorCount: number;
  }>> {
    const integrations = await prisma.integration.findMany({
      where: { userId },
      select: {
        provider: true,
        lastSyncAt: true,
        syncEnabled: true,
        integrationData: true
      },
      orderBy: {
        lastSyncAt: 'desc'
      },
      take: limit
    });

    return integrations.map(integration => ({
      provider: integration.provider,
      lastSyncAt: integration.lastSyncAt,
      syncEnabled: integration.syncEnabled,
      errorCount: 0 // TODO: Calculate from integration data or separate error log
    }));
  }

  /**
   * Validate integration configuration
   */
  validateConfig(config: IntegrationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name) {
      errors.push('Integration name is required');
    }

    if (config.enabled && !config.clientId) {
      errors.push('Client ID is required for enabled integrations');
    }

    if (config.enabled && !config.clientSecret) {
      errors.push('Client secret is required for enabled integrations');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}