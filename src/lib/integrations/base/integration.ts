/**
 * Base integration interface that all third-party integrations must implement
 */

export interface AuthResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

export interface SyncOptions {
  forceSync?: boolean;
  syncType?: 'pull' | 'push' | 'bidirectional';
  applicationIds?: string[];
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  errorCount: number;
  errors: SyncError[];
  lastSyncAt: Date;
}

export interface SyncError {
  type: 'authentication' | 'network' | 'data_mapping' | 'validation' | 'conflict';
  message: string;
  applicationId?: string;
  retryable: boolean;
}

export interface WebhookResult {
  success: boolean;
  processed: boolean;
  error?: string;
}

export interface IntegrationStatus {
  connected: boolean;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  errorCount: number;
  lastError?: string;
}

/**
 * Base integration interface that all third-party integrations must implement
 */
export interface BaseIntegration {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly supportedFeatures: IntegrationFeature[];

  /**
   * Authenticate user with the third-party service
   */
  authenticate(userId: string): Promise<AuthResult>;

  /**
   * Synchronize data between our system and the third-party service
   */
  sync(userId: string, options?: SyncOptions): Promise<SyncResult>;

  /**
   * Handle incoming webhooks from the third-party service
   */
  handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult>;

  /**
   * Disconnect user from the third-party service
   */
  disconnect(userId: string): Promise<void>;

  /**
   * Get current integration status for a user
   */
  getStatus(userId: string): Promise<IntegrationStatus>;

  /**
   * Validate webhook signature (if supported)
   */
  validateWebhookSignature?(payload: string, signature: string): boolean;
}

export type IntegrationFeature = 
  | 'oauth_authentication'
  | 'application_sync'
  | 'status_updates'
  | 'document_sync'
  | 'webhook_support'
  | 'bidirectional_sync';

/**
 * Configuration for integration providers
 */
export interface IntegrationConfig {
  name: string;
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  apiBaseUrl?: string;
  webhookSecret?: string;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

/**
 * Abstract base class providing common integration functionality
 */
export abstract class AbstractIntegration implements BaseIntegration {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly supportedFeatures: IntegrationFeature[];

  constructor(protected config: IntegrationConfig) {}

  abstract authenticate(userId: string): Promise<AuthResult>;
  abstract sync(userId: string, options?: SyncOptions): Promise<SyncResult>;
  abstract handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult>;
  abstract disconnect(userId: string): Promise<void>;
  abstract getStatus(userId: string): Promise<IntegrationStatus>;

  /**
   * Common error handling for all integrations
   */
  protected handleError(error: any, context: string): SyncError {
    console.error(`Integration ${this.name} error in ${context}:`, error);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        type: 'network',
        message: 'Network connection failed',
        retryable: true
      };
    }
    
    if (error.status === 401 || error.status === 403) {
      return {
        type: 'authentication',
        message: 'Authentication failed - please reconnect',
        retryable: false
      };
    }
    
    if (error.status === 429) {
      return {
        type: 'network',
        message: 'Rate limit exceeded - will retry later',
        retryable: true
      };
    }
    
    return {
      type: 'data_mapping',
      message: error.message || 'Unknown error occurred',
      retryable: false
    };
  }

  /**
   * Common retry logic with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Don't retry non-retryable errors
        const syncError = this.handleError(error, 'retry');
        if (!syncError.retryable) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}
