/**
 * Conflict resolution service for integration synchronization
 */

import { prisma } from '@/lib/prisma';
import type { Application, ApplicationRequirement } from '@prisma/client';
import type { SyncableApplication, ExternalApplication } from '../base/sync-service';

export interface ConflictResolutionStrategy {
  name: string;
  description: string;
  resolve: (local: any, external: any, context: ConflictContext) => Promise<ConflictResolution>;
}

export interface ConflictContext {
  userId: string;
  provider: string;
  applicationId: string;
  fieldName: string;
  lastSyncAt?: Date;
}

export interface ConflictResolution {
  action: 'use_local' | 'use_external' | 'merge' | 'manual_review';
  resolvedValue?: any;
  reason: string;
  requiresUserAction: boolean;
  metadata?: Record<string, any>;
}

export interface DetectedConflict {
  id: string;
  applicationId: string;
  provider: string;
  fieldName: string;
  localValue: any;
  externalValue: any;
  conflictType: 'data_mismatch' | 'concurrent_update' | 'schema_change';
  detectedAt: Date;
  resolved: boolean;
  resolution?: ConflictResolution;
}

/**
 * Main conflict resolution service
 */
export class ConflictResolver {
  private strategies: Map<string, ConflictResolutionStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Register a conflict resolution strategy
   */
  registerStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Detect conflicts between local and external applications
   */
  async detectConflicts(
    localApp: SyncableApplication,
    externalApp: ExternalApplication,
    provider: string,
    lastSyncAt?: Date
  ): Promise<DetectedConflict[]> {
    const conflicts: DetectedConflict[] = [];

    // Check for data conflicts in key fields
    const fieldsToCheck = [
      'status',
      'submittedDate',
      'decisionDate',
      'decisionType',
      'notes'
    ];

    for (const field of fieldsToCheck) {
      const localValue = (localApp as any)[field];
      const externalValue = (externalApp as any)[field];

      if (this.hasConflict(localValue, externalValue, field)) {
        const conflictType = this.determineConflictType(
          localValue,
          externalValue,
          localApp.updatedAt,
          externalApp.lastModified,
          lastSyncAt
        );

        conflicts.push({
          id: `${localApp.id}_${field}_${Date.now()}`,
          applicationId: localApp.id,
          provider,
          fieldName: field,
          localValue,
          externalValue,
          conflictType,
          detectedAt: new Date(),
          resolved: false
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve a detected conflict using the appropriate strategy
   */
  async resolveConflict(
    conflict: DetectedConflict,
    strategyName: string = 'last_modified_wins'
  ): Promise<ConflictResolution> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown conflict resolution strategy: ${strategyName}`);
    }

    const context: ConflictContext = {
      userId: '', // Will be set by caller
      provider: conflict.provider,
      applicationId: conflict.applicationId,
      fieldName: conflict.fieldName
    };

    return await strategy.resolve(conflict.localValue, conflict.externalValue, context);
  }

  /**
   * Resolve multiple conflicts in batch
   */
  async resolveConflicts(
    conflicts: DetectedConflict[],
    userId: string,
    strategyName: string = 'last_modified_wins'
  ): Promise<Map<string, ConflictResolution>> {
    const resolutions = new Map<string, ConflictResolution>();

    for (const conflict of conflicts) {
      try {
        const context: ConflictContext = {
          userId,
          provider: conflict.provider,
          applicationId: conflict.applicationId,
          fieldName: conflict.fieldName
        };

        const resolution = await this.resolveConflict(conflict, strategyName);
        resolutions.set(conflict.id, resolution);

        // Store resolution in database for audit trail
        await this.storeConflictResolution(conflict, resolution);

      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
        
        // Create manual review resolution for failed conflicts
        const manualResolution: ConflictResolution = {
          action: 'manual_review',
          reason: `Automatic resolution failed: ${error}`,
          requiresUserAction: true,
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        };
        
        resolutions.set(conflict.id, manualResolution);
        await this.storeConflictResolution(conflict, manualResolution);
      }
    }

    return resolutions;
  }

  /**
   * Apply conflict resolutions to update application data
   */
  async applyResolutions(
    applicationId: string,
    resolutions: Map<string, ConflictResolution>
  ): Promise<void> {
    const updates: Record<string, any> = {};
    let hasUpdates = false;

    for (const [conflictId, resolution] of resolutions) {
      if (resolution.action === 'use_external' || resolution.action === 'merge') {
        const fieldName = this.extractFieldNameFromConflictId(conflictId);
        if (fieldName && resolution.resolvedValue !== undefined) {
          updates[fieldName] = resolution.resolvedValue;
          hasUpdates = true;
        }
      }
    }

    if (hasUpdates) {
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      // Create audit log entry
      await this.createAuditLogEntry(applicationId, updates, resolutions);
    }
  }

  /**
   * Get pending conflicts for a user
   */
  async getPendingConflicts(userId: string, provider?: string): Promise<DetectedConflict[]> {
    // This would typically query a conflicts table
    // For now, return empty array as conflicts are resolved immediately
    return [];
  }

  // Private helper methods

  private registerDefaultStrategies(): void {
    // Last Modified Wins strategy
    this.registerStrategy({
      name: 'last_modified_wins',
      description: 'Use the value from the most recently modified source',
      resolve: async (local: any, external: any, context: ConflictContext): Promise<ConflictResolution> => {
        // Get application timestamps
        const application = await prisma.application.findUnique({
          where: { id: context.applicationId },
          select: { updatedAt: true }
        });

        const mapping = await prisma.externalApplicationMapping.findFirst({
          where: {
            applicationId: context.applicationId,
            integration: { provider: context.provider }
          },
          select: { lastSyncedAt: true }
        });

        const localTimestamp = application?.updatedAt || new Date(0);
        const externalTimestamp = mapping?.lastSyncedAt || new Date(0);

        if (externalTimestamp > localTimestamp) {
          return {
            action: 'use_external',
            resolvedValue: external,
            reason: 'External source was modified more recently',
            requiresUserAction: false
          };
        } else {
          return {
            action: 'use_local',
            resolvedValue: local,
            reason: 'Local source was modified more recently',
            requiresUserAction: false
          };
        }
      }
    });

    // External Source Wins strategy
    this.registerStrategy({
      name: 'external_wins',
      description: 'Always use the external source value',
      resolve: async (local: any, external: any, context: ConflictContext): Promise<ConflictResolution> => {
        return {
          action: 'use_external',
          resolvedValue: external,
          reason: 'External source takes precedence',
          requiresUserAction: false
        };
      }
    });

    // Local Source Wins strategy
    this.registerStrategy({
      name: 'local_wins',
      description: 'Always use the local source value',
      resolve: async (local: any, external: any, context: ConflictContext): Promise<ConflictResolution> => {
        return {
          action: 'use_local',
          resolvedValue: local,
          reason: 'Local source takes precedence',
          requiresUserAction: false
        };
      }
    });

    // Manual Review strategy
    this.registerStrategy({
      name: 'manual_review',
      description: 'Flag for manual user review',
      resolve: async (local: any, external: any, context: ConflictContext): Promise<ConflictResolution> => {
        return {
          action: 'manual_review',
          reason: 'Conflict requires manual review',
          requiresUserAction: true,
          metadata: {
            localValue: local,
            externalValue: external,
            fieldName: context.fieldName
          }
        };
      }
    });

    // Smart Merge strategy for specific fields
    this.registerStrategy({
      name: 'smart_merge',
      description: 'Intelligently merge values based on field type',
      resolve: async (local: any, external: any, context: ConflictContext): Promise<ConflictResolution> => {
        switch (context.fieldName) {
          case 'notes':
            // Merge notes by combining them
            const mergedNotes = this.mergeNotes(local, external);
            return {
              action: 'merge',
              resolvedValue: mergedNotes,
              reason: 'Notes merged from both sources',
              requiresUserAction: false
            };

          case 'status':
            // Use the more advanced status
            const resolvedStatus = this.resolveStatusConflict(local, external);
            return {
              action: resolvedStatus === local ? 'use_local' : 'use_external',
              resolvedValue: resolvedStatus,
              reason: 'Used more advanced status',
              requiresUserAction: false
            };

          default:
            // Fall back to last modified wins
            return this.strategies.get('last_modified_wins')!.resolve(local, external, context);
        }
      }
    });
  }

  private hasConflict(localValue: any, externalValue: any, fieldName: string): boolean {
    // Handle null/undefined values
    if (localValue == null && externalValue == null) {
      return false;
    }
    if (localValue == null || externalValue == null) {
      return true;
    }

    // Handle dates
    if (fieldName.includes('Date') || fieldName.includes('At')) {
      const localDate = new Date(localValue);
      const externalDate = new Date(externalValue);
      return Math.abs(localDate.getTime() - externalDate.getTime()) > 1000; // 1 second tolerance
    }

    // Handle strings
    if (typeof localValue === 'string' && typeof externalValue === 'string') {
      return localValue.trim() !== externalValue.trim();
    }

    // Default comparison
    return localValue !== externalValue;
  }

  private determineConflictType(
    localValue: any,
    externalValue: any,
    localTimestamp: Date,
    externalTimestamp: Date,
    lastSyncAt?: Date
  ): 'data_mismatch' | 'concurrent_update' | 'schema_change' {
    if (!lastSyncAt) {
      return 'data_mismatch';
    }

    // Check if both were modified after last sync (concurrent update)
    if (localTimestamp > lastSyncAt && externalTimestamp > lastSyncAt) {
      return 'concurrent_update';
    }

    // Check for schema changes (type mismatch)
    if (typeof localValue !== typeof externalValue) {
      return 'schema_change';
    }

    return 'data_mismatch';
  }

  private mergeNotes(localNotes: string | null, externalNotes: string | null): string {
    if (!localNotes && !externalNotes) return '';
    if (!localNotes) return externalNotes || '';
    if (!externalNotes) return localNotes;

    // Simple merge - combine with separator
    const separator = '\n---\n';
    return `${localNotes}${separator}${externalNotes}`;
  }

  private resolveStatusConflict(localStatus: string, externalStatus: string): string {
    // Status hierarchy (higher index = more advanced)
    const statusHierarchy = [
      'not_started',
      'in_progress',
      'submitted',
      'under_review',
      'decided'
    ];

    const localIndex = statusHierarchy.indexOf(localStatus);
    const externalIndex = statusHierarchy.indexOf(externalStatus);

    // Use the more advanced status
    return externalIndex > localIndex ? externalStatus : localStatus;
  }

  private async storeConflictResolution(
    conflict: DetectedConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    // In a real implementation, you might store this in a conflicts table
    console.log(`Conflict ${conflict.id} resolved:`, {
      conflict,
      resolution
    });
  }

  private async createAuditLogEntry(
    applicationId: string,
    updates: Record<string, any>,
    resolutions: Map<string, ConflictResolution>
  ): Promise<void> {
    // Create audit log entry for conflict resolution
    console.log(`Conflict resolution applied to application ${applicationId}:`, {
      updates,
      resolutionCount: resolutions.size
    });
  }

  private extractFieldNameFromConflictId(conflictId: string): string | null {
    // Extract field name from conflict ID format: applicationId_fieldName_timestamp
    const parts = conflictId.split('_');
    return parts.length >= 3 ? parts[1] : null;
  }
}