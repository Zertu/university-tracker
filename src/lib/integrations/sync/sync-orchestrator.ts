/**
 * Sync orchestrator that coordinates synchronization across multiple integrations
 */

import { IntegrationManager } from '../manager';
import { ConflictResolver } from './conflict-resolver';
import { RetryManager } from './retry-manager';
import { prisma } from '@/lib/prisma';
import type { SyncResult, SyncOptions, SyncError } from '../base/integration';

export interface SyncJob {
  id: string;
  userId: string;
  provider?: string; // If null, sync all providers
  options: SyncOptions;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  results?: Record<string, SyncResult>;
  error?: string;
  createdAt: Date;
}

export interface SyncSchedule {
  id: string;
  userId: string;
  provider?: string;
  cronExpression: string;
  options: SyncOptions;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  createdAt: Date;
}

export interface SyncStats {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  averageDuration: number;
  lastSyncAt?: Date;
  conflictsResolved: number;
  retriesExecuted: number;
}

/**
 * Orchestrates synchronization across multiple integrations
 */
export class SyncOrchestrator {
  private integrationManager: IntegrationManager;
  private conflictResolver: ConflictResolver;
  private retryManager: RetryManager;
  private runningJobs: Map<string, SyncJob> = new Map();

  constructor() {
    this.integrationManager = IntegrationManager.getInstance();
    this.conflictResolver = new ConflictResolver();
    this.retryManager = new RetryManager();
  }

  /**
   * Start a sync job
   */
  async startSync(
    userId: string,
    provider?: string,
    options: SyncOptions = {}
  ): Promise<SyncJob> {
    const job: SyncJob = {
      id: this.generateJobId(),
      userId,
      provider,
      options,
      status: 'pending',
      createdAt: new Date()
    };

    // Store job
    await this.storeJob(job);

    // Start sync in background
    this.executeSyncJob(job).catch(error => {
      console.error(`Sync job ${job.id} failed:`, error);
    });

    return job;
  }

  /**
   * Execute a sync job
   */
  private async executeSyncJob(job: SyncJob): Promise<void> {
    try {
      // Mark job as running
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs.set(job.id, job);
      await this.updateJob(job);

      // Execute sync
      let results: Record<string, SyncResult>;
      
      if (job.provider) {
        // Sync specific provider
        const result = await this.syncProvider(job.userId, job.provider, job.options);
        results = { [job.provider]: result };
      } else {
        // Sync all providers
        results = await this.syncAllProviders(job.userId, job.options);
      }

      // Process results and handle conflicts
      await this.processResults(job.userId, results);

      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.results = results;
      
    } catch (error) {
      console.error(`Sync job ${job.id} execution failed:`, error);
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.runningJobs.delete(job.id);
      await this.updateJob(job);
    }
  }

  /**
   * Sync a specific provider
   */
  private async syncProvider(
    userId: string,
    provider: string,
    options: SyncOptions
  ): Promise<SyncResult> {
    try {
      const result = await this.integrationManager.syncIntegration(provider, userId, options);
      
      // Handle errors with retry logic
      if (!result.success && result.errors.length > 0) {
        await this.handleSyncErrors(userId, provider, result.errors);
      }

      return result;
    } catch (error) {
      console.error(`Provider sync failed for ${provider}:`, error);
      
      const syncError: SyncError = {
        type: 'data_mapping',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      };

      await this.handleSyncErrors(userId, provider, [syncError]);

      return {
        success: false,
        syncedCount: 0,
        errorCount: 1,
        errors: [syncError],
        lastSyncAt: new Date()
      };
    }
  }

  /**
   * Sync all providers for a user
   */
  private async syncAllProviders(
    userId: string,
    options: SyncOptions
  ): Promise<Record<string, SyncResult>> {
    const results = await this.integrationManager.syncAllIntegrations(userId, options);
    
    // Handle errors for each provider
    for (const [provider, result] of Object.entries(results)) {
      if (!result.success && result.errors.length > 0) {
        await this.handleSyncErrors(userId, provider, result.errors);
      }
    }

    return results;
  }

  /**
   * Process sync results and handle conflicts
   */
  private async processResults(
    userId: string,
    results: Record<string, SyncResult>
  ): Promise<void> {
    for (const [provider, result] of Object.entries(results)) {
      if (result.success) {
        // Check for conflicts in synced applications
        await this.detectAndResolveConflicts(userId, provider);
      }
    }
  }

  /**
   * Detect and resolve conflicts for a provider
   */
  private async detectAndResolveConflicts(
    userId: string,
    provider: string
  ): Promise<void> {
    try {
      // Get applications that were recently synced
      const recentMappings = await prisma.externalApplicationMapping.findMany({
        where: {
          integration: {
            userId,
            provider
          },
          lastSyncedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        include: {
          application: true
        }
      });

      // For each mapping, check for conflicts
      // This is a simplified implementation - in practice, you'd need
      // to compare with external data to detect conflicts
      for (const mapping of recentMappings) {
        // Detect conflicts would require external data comparison
        // For now, we'll skip actual conflict detection
        console.log(`Checking conflicts for application ${mapping.applicationId}`);
      }

    } catch (error) {
      console.error(`Conflict detection failed for ${provider}:`, error);
    }
  }

  /**
   * Handle sync errors with retry logic
   */
  private async handleSyncErrors(
    userId: string,
    provider: string,
    errors: SyncError[]
  ): Promise<void> {
    for (const error of errors) {
      if (error.retryable) {
        await this.retryManager.scheduleRetry(
          userId,
          provider,
          'sync',
          error,
          error.applicationId
        );
      }
    }
  }

  /**
   * Cancel a running sync job
   */
  async cancelSync(jobId: string): Promise<boolean> {
    const job = this.runningJobs.get(jobId);
    if (!job) {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.runningJobs.delete(jobId);
    await this.updateJob(job);

    return true;
  }

  /**
   * Get sync job status
   */
  async getJobStatus(jobId: string): Promise<SyncJob | null> {
    // Check running jobs first
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      return runningJob;
    }

    // Check stored jobs
    return this.getStoredJob(jobId);
  }

  /**
   * Get sync history for a user
   */
  async getSyncHistory(
    userId: string,
    limit: number = 10,
    provider?: string
  ): Promise<SyncJob[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  /**
   * Schedule automatic sync
   */
  async scheduleSync(
    userId: string,
    cronExpression: string,
    provider?: string,
    options: SyncOptions = {}
  ): Promise<SyncSchedule> {
    const schedule: SyncSchedule = {
      id: this.generateScheduleId(),
      userId,
      provider,
      cronExpression,
      options,
      enabled: true,
      nextRun: this.calculateNextRun(cronExpression),
      createdAt: new Date()
    };

    await this.storeSchedule(schedule);
    return schedule;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(
    userId: string,
    provider?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SyncStats> {
    // Mock statistics for demo
    return {
      totalJobs: 50,
      successfulJobs: 45,
      failedJobs: 5,
      averageDuration: 30000, // 30 seconds
      lastSyncAt: new Date(),
      conflictsResolved: 3,
      retriesExecuted: 8
    };
  }

  /**
   * Process scheduled syncs (would be called by a cron job)
   */
  async processScheduledSyncs(): Promise<void> {
    const now = new Date();
    
    // Get schedules that are due
    const dueSchedules = await this.getDueSchedules(now);
    
    for (const schedule of dueSchedules) {
      try {
        // Start sync job
        await this.startSync(schedule.userId, schedule.provider, schedule.options);
        
        // Update next run time
        schedule.lastRun = now;
        schedule.nextRun = this.calculateNextRun(schedule.cronExpression);
        await this.updateSchedule(schedule);
        
      } catch (error) {
        console.error(`Failed to process scheduled sync ${schedule.id}:`, error);
      }
    }
  }

  // Private helper methods

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simplified cron calculation - in practice, use a proper cron library
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 6); // Default to 6 hours from now
    return nextRun;
  }

  private async storeJob(job: SyncJob): Promise<void> {
    // In a real implementation, store in database
    console.log('Storing sync job:', job);
  }

  private async updateJob(job: SyncJob): Promise<void> {
    // In a real implementation, update in database
    console.log('Updating sync job:', job);
  }

  private async getStoredJob(jobId: string): Promise<SyncJob | null> {
    // In a real implementation, query database
    return null;
  }

  private async storeSchedule(schedule: SyncSchedule): Promise<void> {
    // In a real implementation, store in database
    console.log('Storing sync schedule:', schedule);
  }

  private async updateSchedule(schedule: SyncSchedule): Promise<void> {
    // In a real implementation, update in database
    console.log('Updating sync schedule:', schedule);
  }

  private async getDueSchedules(now: Date): Promise<SyncSchedule[]> {
    // In a real implementation, query database for due schedules
    return [];
  }
}
