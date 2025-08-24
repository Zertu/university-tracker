/**
 * Tests for Integration Manager
 */

import { IntegrationManager } from '../manager';
import type { BaseIntegration, IntegrationConfig, AuthResult, SyncResult, WebhookResult, IntegrationStatus } from '../base/integration';

// Mock integration for testing
class MockIntegration implements BaseIntegration {
  readonly name = 'mock';
  readonly displayName = 'Mock Integration';
  readonly description = 'Mock integration for testing';
  readonly supportedFeatures = ['oauth_authentication', 'application_sync'] as const;

  async authenticate(userId: string): Promise<AuthResult> {
    return { success: true };
  }

  async sync(userId: string): Promise<SyncResult> {
    return {
      success: true,
      syncedCount: 1,
      errorCount: 0,
      errors: [],
      lastSyncAt: new Date()
    };
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    return { success: true, processed: true };
  }

  async disconnect(userId: string): Promise<void> {
    // Mock implementation
  }

  async getStatus(userId: string): Promise<IntegrationStatus> {
    return {
      connected: true,
      syncEnabled: true,
      errorCount: 0
    };
  }
}

describe('IntegrationManager', () => {
  let manager: IntegrationManager;
  let mockIntegration: MockIntegration;
  let mockConfig: IntegrationConfig;

  beforeEach(() => {
    // Get fresh instance for each test
    manager = IntegrationManager.getInstance();
    mockIntegration = new MockIntegration();
    mockConfig = {
      name: 'mock',
      enabled: true,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret'
    };
  });

  describe('registerIntegration', () => {
    it('should register a new integration', () => {
      manager.registerIntegration(mockIntegration, mockConfig);
      
      const registered = manager.getRegisteredIntegrations();
      expect(registered).toContain('mock');
    });

    it('should throw error when registering duplicate integration', () => {
      manager.registerIntegration(mockIntegration, mockConfig);
      
      expect(() => {
        manager.registerIntegration(mockIntegration, mockConfig);
      }).toThrow('Integration mock is already registered');
    });
  });

  describe('getIntegration', () => {
    beforeEach(() => {
      manager.registerIntegration(mockIntegration, mockConfig);
    });

    it('should return registered integration', () => {
      const integration = manager.getIntegration('mock');
      expect(integration).toBe(mockIntegration);
    });

    it('should return null for unregistered integration', () => {
      const integration = manager.getIntegration('nonexistent');
      expect(integration).toBeNull();
    });
  });

  describe('getIntegrationConfig', () => {
    beforeEach(() => {
      manager.registerIntegration(mockIntegration, mockConfig);
    });

    it('should return integration config', () => {
      const config = manager.getIntegrationConfig('mock');
      expect(config).toBe(mockConfig);
    });

    it('should return null for unregistered integration', () => {
      const config = manager.getIntegrationConfig('nonexistent');
      expect(config).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const result = manager.validateConfig(mockConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject config without name', () => {
      const invalidConfig = { ...mockConfig, name: '' };
      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Integration name is required');
    });

    it('should reject enabled config without client ID', () => {
      const invalidConfig = { ...mockConfig, clientId: undefined };
      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client ID is required for enabled integrations');
    });

    it('should reject enabled config without client secret', () => {
      const invalidConfig = { ...mockConfig, clientSecret: undefined };
      const result = manager.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Client secret is required for enabled integrations');
    });

    it('should allow disabled config without credentials', () => {
      const disabledConfig = {
        name: 'test',
        enabled: false
      };
      const result = manager.validateConfig(disabledConfig);
      expect(result.valid).toBe(true);
    });
  });
});
