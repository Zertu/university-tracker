/**
 * Integration configuration and registration
 */

import { IntegrationManager } from './manager';
import { CommonAppIntegration } from './commonapp';
import type { IntegrationConfig } from './base/integration';

/**
 * Initialize and register all integrations
 */
export function initializeIntegrations(): void {
  const manager = IntegrationManager.getInstance();

  // Register CommonApp integration
  const commonAppConfig: IntegrationConfig = {
    name: 'commonapp',
    enabled: process.env.COMMONAPP_ENABLED === 'true',
    clientId: process.env.COMMONAPP_CLIENT_ID,
    clientSecret: process.env.COMMONAPP_CLIENT_SECRET,
    redirectUri: process.env.COMMONAPP_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/commonapp/callback`,
    scopes: ['read:applications', 'write:applications', 'read:profile'],
    apiBaseUrl: process.env.COMMONAPP_API_URL || 'https://api.commonapp.org',
    webhookSecret: process.env.COMMONAPP_WEBHOOK_SECRET,
    rateLimits: {
      requestsPerMinute: parseInt(process.env.COMMONAPP_RATE_LIMIT_PER_MINUTE || '60'),
      requestsPerHour: parseInt(process.env.COMMONAPP_RATE_LIMIT_PER_HOUR || '1000')
    }
  };

  // Validate configuration
  const validation = manager.validateConfig(commonAppConfig);
  if (!validation.valid) {
    console.warn('CommonApp integration configuration invalid:', validation.errors);
    commonAppConfig.enabled = false;
  }

  if (commonAppConfig.enabled) {
    const commonAppIntegration = new CommonAppIntegration(commonAppConfig);
    manager.registerIntegration(commonAppIntegration, commonAppConfig);
    console.log('CommonApp integration registered successfully');
  } else {
    console.log('CommonApp integration disabled or not configured');
  }

  // Register other integrations here as they are implemented
  // Example:
  // const coalitionConfig: IntegrationConfig = { ... };
  // const coalitionIntegration = new CoalitionIntegration(coalitionConfig);
  // manager.registerIntegration(coalitionIntegration, coalitionConfig);
}

/**
 * Get integration configuration from environment variables
 */
export function getIntegrationConfig(provider: string): IntegrationConfig | null {
  switch (provider.toLowerCase()) {
    case 'commonapp':
      return {
        name: 'commonapp',
        enabled: process.env.COMMONAPP_ENABLED === 'true',
        clientId: process.env.COMMONAPP_CLIENT_ID,
        clientSecret: process.env.COMMONAPP_CLIENT_SECRET,
        redirectUri: process.env.COMMONAPP_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/integrations/commonapp/callback`,
        scopes: ['read:applications', 'write:applications', 'read:profile'],
        apiBaseUrl: process.env.COMMONAPP_API_URL || 'https://api.commonapp.org',
        webhookSecret: process.env.COMMONAPP_WEBHOOK_SECRET,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.COMMONAPP_RATE_LIMIT_PER_MINUTE || '60'),
          requestsPerHour: parseInt(process.env.COMMONAPP_RATE_LIMIT_PER_HOUR || '1000')
        }
      };

    default:
      return null;
  }
}

/**
 * Check if an integration is properly configured
 */
export function isIntegrationConfigured(provider: string): boolean {
  const config = getIntegrationConfig(provider);
  if (!config) return false;

  const manager = IntegrationManager.getInstance();
  const validation = manager.validateConfig(config);
  
  return validation.valid && config.enabled;
}

/**
 * Get list of available integrations
 */
export function getAvailableIntegrations(): Array<{
  name: string;
  displayName: string;
  description: string;
  configured: boolean;
  enabled: boolean;
}> {
  return [
    {
      name: 'commonapp',
      displayName: 'Common Application',
      description: 'Sync applications with the Common Application platform',
      configured: isIntegrationConfigured('commonapp'),
      enabled: process.env.COMMONAPP_ENABLED === 'true'
    }
    // Add other integrations here as they are implemented
  ];
}
