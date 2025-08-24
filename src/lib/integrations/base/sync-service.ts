/**
 * Base sync service providing common synchronization functionality
 */

import { prisma } from '@/lib/prisma';
import type { Application, Integration, ExternalApplicationMapping, Prisma } from '@prisma/client';
import type { SyncResult, SyncError, SyncOptions } from './integration';

export interface SyncableApplication {
  id: string;
  studentId: string;
  universityId: string;
  applicationType: string;
  status: string;
  deadline: Date;
  submittedDate?: Date | null;
  decisionDate?: Date | null;
  decisionType?: string | null;
  notes?: string | null;
  updatedAt: Date;
}

export interface ExternalApplication {
  id: string;
  universityId: string;
  status: string;
  submittedDate?: Date;
  decisionDate?: Date;
  decisionType?: string;
  lastModified: Date;
  metadata?: Record<string, any>;
}

/**
 * Abstract base sync service that handles common synchronization patterns
 */
export abstract class BaseSyncService {
  constructor(
    protected integrationName: string,
    protected userId: string
  ) {}

  /**
   * Main sync method that orchestrates the synchronization process
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = new Date();
    const errors: SyncError[] = [];
    let syncedCount = 0;

    try {
      // Get integration record
      const integration = await this.getIntegration();
      if (!integration) {
        throw new Error('Integration not found or not connected');
      }

      // Get applications to sync
      const applications = await this.getApplicationsToSync(options.applicationIds);
      
      // Perform sync based on type with conflict detection
      switch (options.syncType || 'bidirectional') {
        case 'pull':
          const pullResult = await this.pullFromExternalWithConflictDetection(integration, applications, options.forceSync);
          syncedCount += pullResult.syncedCount;
          errors.push(...pullResult.errors);
          break;
          
        case 'push':
          const pushResult = await this.pushToExternal(integration, applications);
          syncedCount += pushResult.syncedCount;
          errors.push(...pushResult.errors);
          break;
          
        case 'bidirectional':
        default:
          // Pull first, then push
          const pullBidirectional = await this.pullFromExternalWithConflictDetection(integration, applications, options.forceSync);
          syncedCount += pullBidirectional.syncedCount;
          errors.push(...pullBidirectional.errors);
          
          const pushBidirectional = await this.pushToExternal(integration, applications);
          syncedCount += pushBidirectional.syncedCount;
          errors.push(...pushBidirectional.errors);
          break;
      }

      // Update integration last sync time
      await this.updateLastSyncTime(integration.id, startTime);

      return {
        success: errors.length === 0,
        syncedCount,
        errorCount: errors.length,
        errors,
        lastSyncAt: startTime
      };

    } catch (error) {
      console.error(`Sync failed for ${this.integrationName}:`, error);
      
      return {
        success: false,
        syncedCount,
        errorCount: 1,
        errors: [{
          type: 'data_mapping',
          message: error instanceof Error ? error.message : 'Unknown sync error',
          retryable: true
        }],
        lastSyncAt: startTime
      };
    }
  }

  /**
   * Pull applications from external service with conflict detection
   */
  protected async pullFromExternalWithConflictDetection(
    integration: Integration,
    localApplications: SyncableApplication[],
    forceSync: boolean = false
  ): Promise<{ syncedCount: number; errors: SyncError[] }> {
    const errors: SyncError[] = [];
    let syncedCount = 0;

    try {
      // Get external applications
      const externalApplications = await this.fetchExternalApplications(integration);
      
      for (const externalApp of externalApplications) {
        try {
          // Find corresponding local application
          const localApp = localApplications.find(app => 
            this.matchApplications(app, externalApp)
          );

          if (localApp) {
            // Check for conflicts before updating
            if (!forceSync && this.hasDataConflicts(localApp, externalApp, integration.lastSyncAt)) {
              // Handle conflict - for now, use external data (can be made configurable)
              console.warn(`Conflict detected for application ${localApp.id}, using external data`);
            }
            
            // Check if external app is newer or force sync is enabled
            if (forceSync || this.isExternalNewer(localApp, externalApp)) {
              await this.updateLocalApplication(localApp, externalApp);
              syncedCount++;
            }
          } else {
            // Create new local application if it doesn't exist
            const newApp = await this.createLocalApplication(externalApp);
            if (newApp) {
              syncedCount++;
            }
          }
        } catch (error) {
          errors.push({
            type: 'data_mapping',
            message: `Failed to sync external application ${externalApp.id}: ${error}`,
            applicationId: externalApp.id,
            retryable: true
          });
        }
      }
    } catch (error) {
      errors.push({
        type: 'network',
        message: `Failed to fetch external applications: ${error}`,
        retryable: true
      });
    }

    return { syncedCount, errors };
  }

  /**
   * Check if there are data conflicts between local and external applications
   */
  protected hasDataConflicts(
    localApp: SyncableApplication,
    externalApp: ExternalApplication,
    lastSyncAt?: Date | null
  ): boolean {
    if (!lastSyncAt) {
      return false; // No previous sync, no conflicts
    }

    // Check if both were modified after last sync (concurrent updates)
    const localModifiedAfterSync = localApp.updatedAt > lastSyncAt;
    const externalModifiedAfterSync = externalApp.lastModified > lastSyncAt;

    if (localModifiedAfterSync && externalModifiedAfterSync) {
      // Both modified since last sync - check for actual data differences
      return (
        localApp.status !== externalApp.status ||
        localApp.decisionType !== externalApp.decisionType ||
        this.datesConflict(localApp.submittedDate, externalApp.submittedDate) ||
        this.datesConflict(localApp.decisionDate, externalApp.decisionDate)
      );
    }

    return false;
  }

  /**
   * Check if two dates conflict (allowing for small differences)
   */
  protected datesConflict(date1?: Date | null, date2?: Date | null): boolean {
    if (!date1 && !date2) return false;
    if (!date1 || !date2) return true;
    
    // Allow 1 second difference to account for precision issues
    return Math.abs(date1.getTime() - date2.getTime()) > 1000;
  }

  /**
   * Pull applications from external service
   */
  protected async pullFromExternal(
    integration: Integration,
    localApplications: SyncableApplication[]
  ): Promise<{ syncedCount: number; errors: SyncError[] }> {
    const errors: SyncError[] = [];
    let syncedCount = 0;

    try {
      // Get external applications
      const externalApplications = await this.fetchExternalApplications(integration);
      
      for (const externalApp of externalApplications) {
        try {
          // Find corresponding local application
          const localApp = localApplications.find(app => 
            this.matchApplications(app, externalApp)
          );

          if (localApp) {
            // Check if external app is newer
            if (this.isExternalNewer(localApp, externalApp)) {
              await this.updateLocalApplication(localApp, externalApp);
              syncedCount++;
            }
          } else {
            // Create new local application if it doesn't exist
            const newApp = await this.createLocalApplication(externalApp);
            if (newApp) {
              syncedCount++;
            }
          }
        } catch (error) {
          errors.push({
            type: 'data_mapping',
            message: `Failed to sync external application ${externalApp.id}: ${error}`,
            applicationId: externalApp.id,
            retryable: true
          });
        }
      }
    } catch (error) {
      errors.push({
        type: 'network',
        message: `Failed to fetch external applications: ${error}`,
        retryable: true
      });
    }

    return { syncedCount, errors };
  }

  /**
   * Push applications to external service
   */
  protected async pushToExternal(
    integration: Integration,
    localApplications: SyncableApplication[]
  ): Promise<{ syncedCount: number; errors: SyncError[] }> {
    const errors: SyncError[] = [];
    let syncedCount = 0;

    for (const localApp of localApplications) {
      try {
        // Get existing mapping
        const mapping = await this.getApplicationMapping(localApp.id, integration.id);
        
        if (mapping) {
          // Update existing external application
          await this.updateExternalApplication(integration, localApp, mapping);
        } else {
          // Create new external application
          const externalId = await this.createExternalApplication(integration, localApp);
          if (externalId) {
            await this.createApplicationMapping(localApp.id, integration.id, externalId);
          }
        }
        
        syncedCount++;
      } catch (error) {
        errors.push({
          type: 'data_mapping',
          message: `Failed to push application ${localApp.id}: ${error}`,
          applicationId: localApp.id,
          retryable: true
        });
      }
    }

    return { syncedCount, errors };
  }

  // Abstract methods that must be implemented by specific integrations
  protected abstract fetchExternalApplications(integration: Integration): Promise<ExternalApplication[]>;
  protected abstract updateLocalApplication(localApp: SyncableApplication, externalApp: ExternalApplication): Promise<void>;
  protected abstract createLocalApplication(externalApp: ExternalApplication): Promise<SyncableApplication | null>;
  protected abstract updateExternalApplication(integration: Integration, localApp: SyncableApplication, mapping: ExternalApplicationMapping): Promise<void>;
  protected abstract createExternalApplication(integration: Integration, localApp: SyncableApplication): Promise<string>;
  protected abstract matchApplications(localApp: SyncableApplication, externalApp: ExternalApplication): boolean;

  // Helper methods
  protected isExternalNewer(localApp: SyncableApplication, externalApp: ExternalApplication): boolean {
    return externalApp.lastModified > localApp.updatedAt;
  }

  private async getIntegration(): Promise<Integration | null> {
    return prisma.integration.findUnique({
      where: {
        userId_provider: {
          userId: this.userId,
          provider: this.integrationName
        }
      }
    });
  }

  private async getApplicationsToSync(applicationIds?: string[]): Promise<SyncableApplication[]> {
    const where: Prisma.ApplicationWhereInput = { studentId: this.userId };
    
    if (applicationIds && applicationIds.length > 0) {
      where.id = { in: applicationIds };
    }

    return prisma.application.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        universityId: true,
        applicationType: true,
        status: true,
        deadline: true,
        submittedDate: true,
        decisionDate: true,
        decisionType: true,
        notes: true,
        updatedAt: true
      }
    });
  }

  private async getApplicationMapping(applicationId: string, integrationId: string): Promise<ExternalApplicationMapping | null> {
    return prisma.externalApplicationMapping.findFirst({
      where: {
        applicationId,
        integrationId
      }
    });
  }

  private async createApplicationMapping(applicationId: string, integrationId: string, externalApplicationId: string): Promise<void> {
    await prisma.externalApplicationMapping.create({
      data: {
        applicationId,
        integrationId,
        externalApplicationId,
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      }
    });
  }

  private async updateLastSyncTime(integrationId: string, syncTime: Date): Promise<void> {
    await prisma.integration.update({
      where: { id: integrationId },
      data: { lastSyncAt: syncTime }
    });
  }
}
