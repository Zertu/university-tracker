/**
 * Integration system exports
 */

// Base integration interfaces and classes
export type {
  BaseIntegration,
  AuthResult,
  SyncOptions,
  SyncResult,
  SyncError,
  WebhookResult,
  IntegrationStatus,
  IntegrationConfig,
  IntegrationFeature
} from './base/integration';

export { AbstractIntegration } from './base/integration';

// Base sync service
export type {
  SyncableApplication,
  ExternalApplication
} from './base/sync-service';

export { BaseSyncService } from './base/sync-service';

// Base webhook handler
export type {
  WebhookEvent,
  ProcessedWebhook
} from './base/webhook-handler';

export { BaseWebhookHandler } from './base/webhook-handler';

// Integration manager
export type {
  RegisteredIntegration,
  IntegrationSummary
} from './manager';

export { IntegrationManager } from './manager';

// Sync system
export type {
  ConflictResolutionStrategy,
  ConflictContext,
  ConflictResolution,
  DetectedConflict,
  RetryPolicy,
  RetryAttempt,
  RetryResult,
  SyncJob,
  SyncSchedule,
  SyncStats
} from './sync';

export {
  ConflictResolver,
  RetryManager,
  SyncOrchestrator
} from './sync';

// CommonApp integration
export {
  CommonAppIntegration,
  CommonAppAuth,
  CommonAppClient,
  CommonAppMapper,
  CommonAppSyncService,
  CommonAppWebhookHandler
} from './commonapp';

export type {
  CommonAppOAuthConfig,
  CommonAppClientConfig,
  CommonAppTokenResponse,
  CommonAppUser,
  CommonAppApplication,
  CommonAppRequirement,
  CommonAppCollege,
  CommonAppWebhookEvent,
  CommonAppError,
  CommonAppSyncData
} from './commonapp';

// Utilities
export {
  StatusMappings,
  TokenUtils,
  IntegrationDataUtils,
  ErrorUtils,
  IntegrationDbUtils
} from './utils';

// Configuration
export {
  initializeIntegrations,
  getIntegrationConfig,
  isIntegrationConfigured,
  getAvailableIntegrations
} from './config';

// Re-export commonly used types from Prisma
export type { Integration, ExternalApplicationMapping } from '@prisma/client';
