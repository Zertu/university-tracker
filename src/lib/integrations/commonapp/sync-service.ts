/**
 * CommonApp sync service implementation
 */

import { BaseSyncService } from '../base/sync-service';
import { CommonAppClient } from './client';
import { CommonAppMapper } from './mapper';
import { prisma } from '@/lib/prisma';
import type { Integration, ExternalApplicationMapping } from '@prisma/client';
import type { SyncableApplication, ExternalApplication } from '../base/sync-service';
import type { CommonAppApplication } from './types';

export class CommonAppSyncService extends BaseSyncService {
  private client: CommonAppClient;

  constructor(userId: string, client: CommonAppClient) {
    super('commonapp', userId);
    this.client = client;
  }

  /**
   * Fetch applications from CommonApp
   */
  protected async fetchExternalApplications(integration: Integration): Promise<ExternalApplication[]> {
    try {
      const commonAppApplications = await this.client.getApplications(this.userId);
      
      return commonAppApplications.map(app => 
        CommonAppMapper.mapToExternalApplication(app)
      );
    } catch (error) {
      console.error('Failed to fetch CommonApp applications:', error);
      throw new Error(`Failed to fetch applications from CommonApp: ${error}`);
    }
  }

  /**
   * Update local application with data from CommonApp
   */
  protected async updateLocalApplication(
    localApp: SyncableApplication,
    externalApp: ExternalApplication
  ): Promise<void> {
    try {
      const updates = {
        status: externalApp.status,
        submittedDate: externalApp.submittedDate || null,
        decisionDate: externalApp.decisionDate || null,
        decisionType: externalApp.decisionType || null,
        updatedAt: externalApp.lastModified
      };

      await prisma.application.update({
        where: { id: localApp.id },
        data: updates
      });

      // Create status history entry if status changed
      if (localApp.status !== externalApp.status) {
        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: localApp.id,
            fromStatus: localApp.status,
            toStatus: externalApp.status,
            changedBy: this.userId,
            notes: 'Updated via CommonApp sync'
          }
        });
      }

      // Update application mapping sync status
      await this.updateMappingSyncStatus(localApp.id, externalApp.id);

    } catch (error) {
      console.error('Failed to update local application:', error);
      throw error;
    }
  }

  /**
   * Create new local application from CommonApp data
   */
  protected async createLocalApplication(externalApp: ExternalApplication): Promise<SyncableApplication | null> {
    try {
      // Check if we have a corresponding university in our system
      const university = await prisma.university.findFirst({
        where: {
          // Try to match by external ID or name
          OR: [
            { id: externalApp.universityId },
            { name: { contains: externalApp.metadata?.college_name || '' } }
          ]
        }
      });

      if (!university) {
        console.warn(`University not found for external application: ${externalApp.id}`);
        return null;
      }

      // Create the application
      const newApplication = await prisma.application.create({
        data: {
          studentId: this.userId,
          universityId: university.id,
          applicationType: this.mapApplicationType(externalApp.metadata?.application_type || 'regular'),
          status: externalApp.status,
          deadline: this.calculateDeadline(university, externalApp.metadata?.application_type),
          submittedDate: externalApp.submittedDate || null,
          decisionDate: externalApp.decisionDate || null,
          decisionType: externalApp.decisionType || null,
          notes: 'Created via CommonApp sync'
        }
      });

      // Create application mapping
      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId: this.userId,
            provider: 'commonapp'
          }
        }
      });

      if (integration) {
        await prisma.externalApplicationMapping.create({
          data: {
            applicationId: newApplication.id,
            integrationId: integration.id,
            externalApplicationId: externalApp.id,
            syncStatus: 'synced',
            lastSyncedAt: new Date()
          }
        });
      }

      return {
        id: newApplication.id,
        studentId: newApplication.studentId,
        universityId: newApplication.universityId,
        applicationType: newApplication.applicationType,
        status: newApplication.status,
        deadline: newApplication.deadline,
        submittedDate: newApplication.submittedDate,
        decisionDate: newApplication.decisionDate,
        decisionType: newApplication.decisionType,
        notes: newApplication.notes,
        updatedAt: newApplication.updatedAt
      };

    } catch (error) {
      console.error('Failed to create local application:', error);
      throw error;
    }
  }

  /**
   * Update external application in CommonApp
   */
  protected async updateExternalApplication(
    integration: Integration,
    localApp: SyncableApplication,
    mapping: ExternalApplicationMapping
  ): Promise<void> {
    try {
      const updates = CommonAppMapper.mapToCommonAppApplication(localApp);
      
      await this.client.updateApplication(
        this.userId,
        mapping.externalApplicationId,
        updates
      );

      // Update mapping sync status
      await this.updateMappingSyncStatus(localApp.id, mapping.externalApplicationId);

    } catch (error) {
      console.error('Failed to update CommonApp application:', error);
      throw error;
    }
  }

  /**
   * Create new external application in CommonApp
   */
  protected async createExternalApplication(
    integration: Integration,
    localApp: SyncableApplication
  ): Promise<string> {
    try {
      // Get university information to find CommonApp college ID
      const university = await prisma.university.findUnique({
        where: { id: localApp.universityId }
      });

      if (!university) {
        throw new Error(`University not found: ${localApp.universityId}`);
      }

      // Map to CommonApp format
      const commonAppData = CommonAppMapper.mapToCommonAppApplication(localApp);
      
      // Try to find the corresponding CommonApp college
      const colleges = await this.client.getColleges(this.userId, {
        search: university.name
      });

      const matchingCollege = colleges.find(college => 
        college.name.toLowerCase().includes(university.name.toLowerCase()) ||
        university.name.toLowerCase().includes(college.name.toLowerCase())
      );

      if (!matchingCollege) {
        throw new Error(`CommonApp college not found for: ${university.name}`);
      }

      commonAppData.college_id = matchingCollege.id;

      // Create the application in CommonApp
      const createdApp = await this.client.createApplication(this.userId, commonAppData);
      
      return createdApp.id;

    } catch (error) {
      console.error('Failed to create CommonApp application:', error);
      throw error;
    }
  }

  /**
   * Check if applications match
   */
  protected matchApplications(
    localApp: SyncableApplication,
    externalApp: ExternalApplication
  ): boolean {
    return CommonAppMapper.matchApplications(localApp, externalApp);
  }

  // Private helper methods

  private async updateMappingSyncStatus(applicationId: string, externalApplicationId: string): Promise<void> {
    await prisma.externalApplicationMapping.updateMany({
      where: {
        applicationId,
        externalApplicationId
      },
      data: {
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        syncErrorMessage: null
      }
    });
  }

  private mapApplicationType(externalType: string): string {
    const typeMap: Record<string, string> = {
      'early_decision': 'early_decision',
      'early_action': 'early_action',
      'regular_decision': 'regular',
      'rolling': 'rolling'
    };
    return typeMap[externalType] || 'regular';
  }

  private calculateDeadline(university: any, applicationType?: string): Date {
    // Try to parse deadlines from university data
    try {
      const deadlines = typeof university.deadlines === 'string' 
        ? JSON.parse(university.deadlines) 
        : university.deadlines;

      if (deadlines && applicationType) {
        const deadlineKey = applicationType.replace('_decision', '').replace('_action', '');
        const deadline = deadlines[deadlineKey];
        if (deadline) {
          return new Date(deadline);
        }
      }
    } catch (error) {
      console.error('Failed to parse university deadlines:', error);
    }

    // Default deadline (6 months from now)
    const defaultDeadline = new Date();
    defaultDeadline.setMonth(defaultDeadline.getMonth() + 6);
    return defaultDeadline;
  }
}
