/**
 * Utility functions for integration management
 */

import { prisma } from '@/lib/prisma';
import type { Integration } from '@prisma/client';

/**
 * Status mapping utilities
 */
export const StatusMappings = {
  /**
   * Map common external statuses to internal statuses
   */
  mapToInternalStatus(externalStatus: string, provider: string): string {
    const statusMap: Record<string, Record<string, string>> = {
      commonapp: {
        'not_started': 'not_started',
        'in_progress': 'in_progress',
        'submitted': 'submitted',
        'under_review': 'under_review',
        'decision_made': 'decided',
        'completed': 'decided'
      },
      coalition: {
        'draft': 'not_started',
        'in_progress': 'in_progress',
        'submitted': 'submitted',
        'reviewing': 'under_review',
        'decided': 'decided'
      }
    };

    const providerMap = statusMap[provider.toLowerCase()];
    if (!providerMap) {
      console.warn(`No status mapping found for provider: ${provider}`);
      return externalStatus;
    }

    return providerMap[externalStatus.toLowerCase()] || externalStatus;
  },

  /**
   * Map internal statuses to external statuses
   */
  mapToExternalStatus(internalStatus: string, provider: string): string {
    const statusMap: Record<string, Record<string, string>> = {
      commonapp: {
        'not_started': 'not_started',
        'in_progress': 'in_progress',
        'submitted': 'submitted',
        'under_review': 'under_review',
        'decided': 'decision_made'
      },
      coalition: {
        'not_started': 'draft',
        'in_progress': 'in_progress',
        'submitted': 'submitted',
        'under_review': 'reviewing',
        'decided': 'decided'
      }
    };

    const providerMap = statusMap[provider.toLowerCase()];
    if (!providerMap) {
      console.warn(`No status mapping found for provider: ${provider}`);
      return internalStatus;
    }

    return providerMap[internalStatus] || internalStatus;
  },

  /**
   * Map external decision types to internal decision types
   */
  mapToInternalDecision(externalDecision: string): string {
    const decisionMap: Record<string, string> = {
      'accepted': 'accepted',
      'admit': 'accepted',
      'admitted': 'accepted',
      'rejected': 'rejected',
      'denied': 'rejected',
      'decline': 'rejected',
      'waitlisted': 'waitlisted',
      'waitlist': 'waitlisted',
      'deferred': 'waitlisted'
    };

    return decisionMap[externalDecision.toLowerCase()] || externalDecision;
  }
};

/**
 * Token management utilities
 */
export const TokenUtils = {
  /**
   * Check if a token is expired or will expire soon
   */
  isTokenExpired(expiresAt: Date, bufferMinutes: number = 5): boolean {
    const now = new Date();
    const expiryWithBuffer = new Date(expiresAt.getTime() - (bufferMinutes * 60 * 1000));
    return now >= expiryWithBuffer;
  },

  /**
   * Encrypt sensitive token data (simplified implementation)
   */
  encryptToken(token: string): string {
    // In production, use proper encryption like crypto.createCipher
    // This is a placeholder implementation
    return Buffer.from(token).toString('base64');
  },

  /**
   * Decrypt sensitive token data (simplified implementation)
   */
  decryptToken(encryptedToken: string): string {
    // In production, use proper decryption like crypto.createDecipher
    // This is a placeholder implementation
    return Buffer.from(encryptedToken, 'base64').toString();
  }
};

/**
 * Integration data utilities
 */
export const IntegrationDataUtils = {
  /**
   * Safely parse integration data JSON
   */
  parseIntegrationData(data: string | null): Record<string, any> {
    if (!data) return {};
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse integration data:', error);
      return {};
    }
  },

  /**
   * Safely stringify integration data
   */
  stringifyIntegrationData(data: Record<string, any>): string {
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.error('Failed to stringify integration data:', error);
      return '{}';
    }
  },

  /**
   * Update integration data with new values
   */
  updateIntegrationData(
    existingData: string | null, 
    updates: Record<string, any>
  ): string {
    const current = this.parseIntegrationData(existingData);
    const updated = { ...current, ...updates };
    return this.stringifyIntegrationData(updated);
  }
};

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Categorize integration errors
   */
  categorizeError(error: any): {
    type: 'authentication' | 'network' | 'data_mapping' | 'validation' | 'conflict';
    retryable: boolean;
    message: string;
  } {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        type: 'network',
        retryable: true,
        message: 'Network connection failed'
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        type: 'authentication',
        retryable: false,
        message: 'Authentication failed - please reconnect'
      };
    }

    if (error.status === 429) {
      return {
        type: 'network',
        retryable: true,
        message: 'Rate limit exceeded'
      };
    }

    if (error.status >= 400 && error.status < 500) {
      return {
        type: 'validation',
        retryable: false,
        message: error.message || 'Invalid request'
      };
    }

    if (error.status >= 500) {
      return {
        type: 'network',
        retryable: true,
        message: 'Server error - will retry'
      };
    }

    return {
      type: 'data_mapping',
      retryable: false,
      message: error.message || 'Unknown error'
    };
  },

  /**
   * Create user-friendly error messages
   */
  createUserMessage(error: any): string {
    const categorized = this.categorizeError(error);
    
    switch (categorized.type) {
      case 'authentication':
        return 'Please reconnect your account to continue syncing.';
      case 'network':
        return 'Connection issue - we\'ll retry automatically.';
      case 'validation':
        return 'There was an issue with your data. Please check and try again.';
      case 'conflict':
        return 'Data conflict detected - please review and resolve manually.';
      default:
        return 'Something went wrong. Our team has been notified.';
    }
  }
};

/**
 * Database utilities for integrations
 */
export const IntegrationDbUtils = {
  /**
   * Get integration by user and provider
   */
  async getIntegration(userId: string, provider: string): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId,
          provider
        }
      }
    });
  },

  /**
   * Create or update integration
   */
  async upsertIntegration(data: {
    userId: string;
    provider: string;
    externalUserId: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    integrationData?: Record<string, any>;
  }): Promise<Integration> {
    const integrationDataString = data.integrationData 
      ? IntegrationDataUtils.stringifyIntegrationData(data.integrationData)
      : null;

    return prisma.integration.upsert({
      where: {
        userId_provider: {
          userId: data.userId,
          provider: data.provider
        }
      },
      create: {
        userId: data.userId,
        provider: data.provider,
        externalUserId: data.externalUserId,
        accessToken: TokenUtils.encryptToken(data.accessToken),
        refreshToken: TokenUtils.encryptToken(data.refreshToken),
        tokenExpiresAt: data.tokenExpiresAt,
        integrationData: integrationDataString,
        syncEnabled: true
      },
      update: {
        externalUserId: data.externalUserId,
        accessToken: TokenUtils.encryptToken(data.accessToken),
        refreshToken: TokenUtils.encryptToken(data.refreshToken),
        tokenExpiresAt: data.tokenExpiresAt,
        integrationData: integrationDataString,
        updatedAt: new Date()
      }
    });
  },

  /**
   * Delete integration and all related mappings
   */
  async deleteIntegration(userId: string, provider: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete all application mappings first
      await tx.externalApplicationMapping.deleteMany({
        where: {
          integration: {
            userId,
            provider
          }
        }
      });

      // Delete the integration
      await tx.integration.delete({
        where: {
          userId_provider: {
            userId,
            provider
          }
        }
      });
    });
  },

  /**
   * Update integration sync status
   */
  async updateSyncStatus(
    integrationId: string, 
    lastSyncAt: Date, 
    errorCount?: number
  ): Promise<void> {
    const updateData: any = { lastSyncAt };
    
    if (errorCount !== undefined) {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });
      
      if (integration) {
        const data = IntegrationDataUtils.parseIntegrationData(integration.integrationData);
        data.errorCount = errorCount;
        updateData.integrationData = IntegrationDataUtils.stringifyIntegrationData(data);
      }
    }

    await prisma.integration.update({
      where: { id: integrationId },
      data: updateData
    });
  }
};
