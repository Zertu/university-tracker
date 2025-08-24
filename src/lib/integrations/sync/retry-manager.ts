/**
 * Retry manager for handling failed sync operations
 */

import { prisma } from '@/lib/prisma';
import type { SyncError } from '../base/integration';

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryAttempt {
  id: string;
  userId: string;
  provider: string;
  operation: string;
  applicationId?: string;
  attempt: number;
  maxRetries: number;
  nextRetryAt: Date;
  lastError: string;
  errorType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetryResult {
  success: boolean;
  shouldRetry: boolean;
  nextRetryAt?: Date;
  error?: string;
}

/**
 * Manages retry logic for failed sync operations
 */
export class RetryManager {
  private defaultPolicy: RetryPolicy = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    retryableErrors: ['network', 'authentication', 'rate_limit']
  };

  private policies: Map<string, RetryPolicy> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  /**
   * Register a retry policy for a specific provider or operation
   */
  registerPolicy(key: string, policy: RetryPolicy): void {
    this.policies.set(key, policy);
  }

  /**
   * Get retry policy for a provider/operation
   */
  getPolicy(provider: string, operation?: string): RetryPolicy {
    const operationKey = operation ? `${provider}_${operation}` : provider;
    return this.policies.get(operationKey) || this.policies.get(provider) || this.defaultPolicy;
  }

  /**
   * Schedule a retry for a failed operation
   */
  async scheduleRetry(
    userId: string,
    provider: string,
    operation: string,
    error: SyncError,
    applicationId?: string
  ): Promise<RetryAttempt | null> {
    const policy = this.getPolicy(provider, operation);

    // Check if error is retryable
    if (!error.retryable || !policy.retryableErrors.includes(error.type)) {
      console.log(`Error not retryable: ${error.type} - ${error.message}`);
      return null;
    }

    // Check existing retry attempts
    const existingAttempt = await this.getExistingRetryAttempt(
      userId,
      provider,
      operation,
      applicationId
    );

    let attempt = 1;
    if (existingAttempt) {
      attempt = existingAttempt.attempt + 1;
      
      // Check if max retries exceeded
      if (attempt > policy.maxRetries) {
        console.log(`Max retries exceeded for ${provider} ${operation}`);
        await this.markRetryFailed(existingAttempt.id);
        return null;
      }
    }

    // Calculate next retry time with exponential backoff
    const delay = Math.min(
      policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt - 1),
      policy.maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    const nextRetryAt = new Date(Date.now() + delay + jitter);

    // Create or update retry attempt
    const retryAttempt: RetryAttempt = {
      id: existingAttempt?.id || this.generateRetryId(),
      userId,
      provider,
      operation,
      applicationId,
      attempt,
      maxRetries: policy.maxRetries,
      nextRetryAt,
      lastError: error.message,
      errorType: error.type,
      createdAt: existingAttempt?.createdAt || new Date(),
      updatedAt: new Date()
    };

    await this.storeRetryAttempt(retryAttempt);
    
    console.log(`Scheduled retry ${attempt}/${policy.maxRetries} for ${provider} ${operation} at ${nextRetryAt}`);
    
    return retryAttempt;
  }

  /**
   * Get pending retries that are ready to execute
   */
  async getPendingRetries(limit: number = 10): Promise<RetryAttempt[]> {
    // In a real implementation, this would query a retries table
    // For now, return empty array as we handle retries immediately
    return [];
  }

  /**
   * Execute a retry attempt
   */
  async executeRetry(retryAttempt: RetryAttempt): Promise<RetryResult> {
    try {
      // This would be implemented by the specific integration
      // For now, return a mock result
      const success = Math.random() > 0.5; // 50% success rate for demo
      
      if (success) {
        await this.markRetrySuccessful(retryAttempt.id);
        return { success: true, shouldRetry: false };
      } else {
        // Schedule next retry if not at max attempts
        if (retryAttempt.attempt < retryAttempt.maxRetries) {
          const policy = this.getPolicy(retryAttempt.provider, retryAttempt.operation);
          const delay = Math.min(
            policy.baseDelay * Math.pow(policy.backoffMultiplier, retryAttempt.attempt),
            policy.maxDelay
          );
          const nextRetryAt = new Date(Date.now() + delay);
          
          await this.updateRetryAttempt(retryAttempt.id, {
            attempt: retryAttempt.attempt + 1,
            nextRetryAt,
            lastError: 'Retry failed',
            updatedAt: new Date()
          });
          
          return { success: false, shouldRetry: true, nextRetryAt };
        } else {
          await this.markRetryFailed(retryAttempt.id);
          return { success: false, shouldRetry: false, error: 'Max retries exceeded' };
        }
      }
    } catch (error) {
      console.error('Retry execution failed:', error);
      return { 
        success: false, 
        shouldRetry: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel all pending retries for a user/provider
   */
  async cancelRetries(userId: string, provider?: string, applicationId?: string): Promise<void> {
    console.log(`Cancelling retries for user ${userId}, provider: ${provider}, application: ${applicationId}`);
    // In a real implementation, this would update the retries table
  }

  /**
   * Get retry statistics for monitoring
   */
  async getRetryStats(provider?: string, timeRange?: { start: Date; end: Date }): Promise<{
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    averageAttempts: number;
  }> {
    // Mock statistics for demo
    return {
      totalRetries: 100,
      successfulRetries: 75,
      failedRetries: 25,
      averageAttempts: 1.8
    };
  }

  /**
   * Clean up old retry records
   */
  async cleanupOldRetries(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    console.log(`Cleaning up retry records older than ${cutoffDate}`);
    // In a real implementation, this would delete old records
    return 0;
  }

  // Private helper methods

  private registerDefaultPolicies(): void {
    // CommonApp specific policy
    this.registerPolicy('commonapp', {
      maxRetries: 5,
      baseDelay: 2000, // 2 seconds
      maxDelay: 600000, // 10 minutes
      backoffMultiplier: 2,
      retryableErrors: ['network', 'authentication', 'rate_limit']
    });

    // Authentication operations need fewer retries
    this.registerPolicy('commonapp_authenticate', {
      maxRetries: 2,
      baseDelay: 5000, // 5 seconds
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      retryableErrors: ['network']
    });

    // Webhook operations should retry quickly
    this.registerPolicy('webhook', {
      maxRetries: 3,
      baseDelay: 500, // 0.5 seconds
      maxDelay: 5000, // 5 seconds
      backoffMultiplier: 2,
      retryableErrors: ['network', 'data_mapping']
    });
  }

  private generateRetryId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getExistingRetryAttempt(
    userId: string,
    provider: string,
    operation: string,
    applicationId?: string
  ): Promise<RetryAttempt | null> {
    // In a real implementation, this would query the database
    // For now, return null (no existing attempts)
    return null;
  }

  private async storeRetryAttempt(retryAttempt: RetryAttempt): Promise<void> {
    // In a real implementation, this would store in database
    console.log('Storing retry attempt:', retryAttempt);
  }

  private async updateRetryAttempt(
    retryId: string,
    updates: Partial<RetryAttempt>
  ): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Updating retry ${retryId}:`, updates);
  }

  private async markRetrySuccessful(retryId: string): Promise<void> {
    // In a real implementation, this would mark the retry as successful
    console.log(`Retry ${retryId} successful`);
  }

  private async markRetryFailed(retryId: string): Promise<void> {
    // In a real implementation, this would mark the retry as failed
    console.log(`Retry ${retryId} failed permanently`);
  }
}
