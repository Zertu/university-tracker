/**
 * Integration system end-to-end tests
 */

import { IntegrationManager } from '../manager';
import { CommonAppIntegration } from '../commonapp';
import { ConflictResolver } from '../sync/conflict-resolver';
import { RetryManager } from '../sync/retry-manager';
import { SyncOrchestrator } from '../sync/sync-orchestrator';
import type { IntegrationConfig } from '../base/integration';

describe('Integration System', () => {
  let manager: IntegrationManager;
  let mockConfig: IntegrationConfig;

  beforeEach(() => {
    manager = IntegrationManager.getInstance();
    mockConfig = {
      name: 'commonapp',
      enabled: true,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/api/integrations/commonapp/callback',
      scopes: ['read:applications', 'write:applications'],
      apiBaseUrl: 'https://api.commonapp.org',
      webhookSecret: 'test-webhook-secret'
    };
  });

  describe('Integration Registration', () => {
    it('should register CommonApp integration successfully', () => {
      const integration = new CommonAppIntegration(mockConfig);
      manager.registerIntegration(integration, mockConfig);

      const registered = manager.getRegisteredIntegrations();
      expect(registered).toContain('commonapp');

      const retrievedIntegration = manager.getIntegration('commonapp');
      expect(retrievedIntegration).toBe(integration);
    });

    it('should validate integration configuration', () => {
      const validConfig = { ...mockConfig };
      const validation = manager.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const invalidConfig = { ...mockConfig, clientId: undefined };
      const invalidValidation = manager.validateConfig(invalidConfig);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should detect conflicts between local and external data', async () => {
      const resolver = new ConflictResolver();
      
      const localApp = {
        id: 'local-1',
        studentId: 'user-1',
        universityId: 'uni-1',
        applicationType: 'regular',
        status: 'in_progress',
        deadline: new Date('2024-01-15'),
        submittedDate: null,
        decisionDate: null,
        decisionType: null,
        notes: 'Local notes',
        updatedAt: new Date('2024-01-10')
      };

      const externalApp = {
        id: 'external-1',
        universityId: 'uni-1',
        status: 'submitted',
        submittedDate: new Date('2024-01-12'),
        decisionDate: undefined,
        decisionType: undefined,
        lastModified: new Date('2024-01-12'),
        metadata: {}
      };

      const conflicts = await resolver.detectConflicts(
        localApp,
        externalApp,
        'commonapp',
        new Date('2024-01-01')
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].fieldName).toBe('status');
      expect(conflicts[0].localValue).toBe('in_progress');
      expect(conflicts[0].externalValue).toBe('submitted');
    });

    it('should resolve conflicts using last modified wins strategy', async () => {
      const resolver = new ConflictResolver();
      
      const conflict = {
        id: 'conflict-1',
        applicationId: 'app-1',
        provider: 'commonapp',
        fieldName: 'status',
        localValue: 'in_progress',
        externalValue: 'submitted',
        conflictType: 'concurrent_update' as const,
        detectedAt: new Date(),
        resolved: false
      };

      const resolution = await resolver.resolveConflict(conflict, 'external_wins');
      
      expect(resolution.action).toBe('use_external');
      expect(resolution.resolvedValue).toBe('submitted');
      expect(resolution.requiresUserAction).toBe(false);
    });
  });

  describe('Retry Management', () => {
    it('should schedule retries for retryable errors', async () => {
      const retryManager = new RetryManager();
      
      const error = {
        type: 'network' as const,
        message: 'Connection timeout',
        retryable: true
      };

      const retryAttempt = await retryManager.scheduleRetry(
        'user-1',
        'commonapp',
        'sync',
        error,
        'app-1'
      );

      expect(retryAttempt).not.toBeNull();
      expect(retryAttempt?.attempt).toBe(1);
      expect(retryAttempt?.nextRetryAt).toBeInstanceOf(Date);
    });

    it('should not schedule retries for non-retryable errors', async () => {
      const retryManager = new RetryManager();
      
      const error = {
        type: 'validation' as const,
        message: 'Invalid data format',
        retryable: false
      };

      const retryAttempt = await retryManager.scheduleRetry(
        'user-1',
        'commonapp',
        'sync',
        error,
        'app-1'
      );

      expect(retryAttempt).toBeNull();
    });
  });

  describe('Sync Orchestration', () => {
    it('should create and track sync jobs', async () => {
      const orchestrator = new SyncOrchestrator();
      
      const job = await orchestrator.startSync('user-1', 'commonapp', {
        syncType: 'pull',
        forceSync: false
      });

      expect(job.id).toBeDefined();
      expect(job.userId).toBe('user-1');
      expect(job.provider).toBe('commonapp');
      expect(job.status).toBe('pending');
      expect(job.options.syncType).toBe('pull');
    });

    it('should generate sync statistics', async () => {
      const orchestrator = new SyncOrchestrator();
      
      const stats = await orchestrator.getSyncStats('user-1', 'commonapp');
      
      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('successfulJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('averageDuration');
      expect(stats).toHaveProperty('conflictsResolved');
      expect(stats).toHaveProperty('retriesExecuted');
    });
  });

  describe('Integration Features', () => {
    it('should report correct supported features for CommonApp', () => {
      const integration = new CommonAppIntegration(mockConfig);
      
      expect(integration.supportedFeatures).toContain('oauth_authentication');
      expect(integration.supportedFeatures).toContain('application_sync');
      expect(integration.supportedFeatures).toContain('status_updates');
      expect(integration.supportedFeatures).toContain('webhook_support');
      expect(integration.supportedFeatures).toContain('bidirectional_sync');
    });

    it('should have correct integration metadata', () => {
      const integration = new CommonAppIntegration(mockConfig);
      
      expect(integration.name).toBe('commonapp');
      expect(integration.displayName).toBe('Common Application');
      expect(integration.description).toContain('Common Application platform');
    });
  });
});
