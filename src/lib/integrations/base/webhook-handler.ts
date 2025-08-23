/**
 * Base webhook handler providing common webhook processing functionality
 */

import { prisma } from '@/lib/prisma';
import type { WebhookResult } from './integration';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  source: string;
}

export interface ProcessedWebhook {
  eventId: string;
  processed: boolean;
  error?: string;
  updatedApplications: string[];
}

/**
 * Abstract base webhook handler
 */
export abstract class BaseWebhookHandler {
  constructor(
    protected integrationName: string
  ) {}

  /**
   * Main webhook processing method
   */
  async handleWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult> {
    try {
      // Validate webhook signature if supported
      if (this.supportsSignatureValidation()) {
        const signature = this.extractSignature(headers);
        if (!signature || !this.validateSignature(payload, signature)) {
          return {
            success: false,
            processed: false,
            error: 'Invalid webhook signature'
          };
        }
      }

      // Parse webhook event
      const event = this.parseWebhookEvent(payload);
      if (!event) {
        return {
          success: false,
          processed: false,
          error: 'Invalid webhook payload'
        };
      }

      // Check if event was already processed
      const alreadyProcessed = await this.isEventProcessed(event.id);
      if (alreadyProcessed) {
        return {
          success: true,
          processed: false,
          error: 'Event already processed'
        };
      }

      // Process the event
      const result = await this.processEvent(event);
      
      // Mark event as processed
      await this.markEventProcessed(event.id, result);

      return {
        success: true,
        processed: true
      };

    } catch (error) {
      console.error(`Webhook processing failed for ${this.integrationName}:`, error);
      
      return {
        success: false,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown webhook error'
      };
    }
  }

  /**
   * Process a specific webhook event
   */
  protected async processEvent(event: WebhookEvent): Promise<ProcessedWebhook> {
    const updatedApplications: string[] = [];

    try {
      switch (event.type) {
        case 'application.status_changed':
          const statusResult = await this.handleStatusChange(event);
          updatedApplications.push(...statusResult.updatedApplications);
          break;

        case 'application.submitted':
          const submitResult = await this.handleApplicationSubmitted(event);
          updatedApplications.push(...submitResult.updatedApplications);
          break;

        case 'application.decision_received':
          const decisionResult = await this.handleDecisionReceived(event);
          updatedApplications.push(...decisionResult.updatedApplications);
          break;

        case 'document.uploaded':
          const docResult = await this.handleDocumentUploaded(event);
          updatedApplications.push(...docResult.updatedApplications);
          break;

        default:
          console.warn(`Unhandled webhook event type: ${event.type}`);
          break;
      }

      return {
        eventId: event.id,
        processed: true,
        updatedApplications
      };

    } catch (error) {
      return {
        eventId: event.id,
        processed: false,
        error: error instanceof Error ? error.message : 'Event processing failed',
        updatedApplications
      };
    }
  }

  /**
   * Handle application status change events
   */
  protected async handleStatusChange(event: WebhookEvent): Promise<{ updatedApplications: string[] }> {
    const { externalApplicationId, newStatus, timestamp } = event.data;
    const updatedApplications: string[] = [];

    try {
      // Find the corresponding local application
      const mapping = await prisma.externalApplicationMapping.findFirst({
        where: {
          externalApplicationId,
          integration: {
            provider: this.integrationName
          }
        },
        include: {
          application: true,
          integration: true
        }
      });

      if (!mapping) {
        console.warn(`No mapping found for external application: ${externalApplicationId}`);
        return { updatedApplications };
      }

      // Map external status to internal status
      const internalStatus = this.mapExternalStatus(newStatus);
      
      // Update local application if status is different
      if (mapping.application.status !== internalStatus) {
        await prisma.application.update({
          where: { id: mapping.applicationId },
          data: {
            status: internalStatus,
            updatedAt: new Date(timestamp)
          }
        });

        // Create status history entry
        await prisma.applicationStatusHistory.create({
          data: {
            applicationId: mapping.applicationId,
            fromStatus: mapping.application.status,
            toStatus: internalStatus,
            changedBy: mapping.integration.userId,
            notes: `Updated via ${this.integrationName} webhook`
          }
        });

        updatedApplications.push(mapping.applicationId);
      }

      // Update mapping sync status
      await prisma.externalApplicationMapping.update({
        where: { id: mapping.id },
        data: {
          syncStatus: 'synced',
          lastSyncedAt: new Date()
        }
      });

    } catch (error) {
      console.error('Failed to handle status change:', error);
      throw error;
    }

    return { updatedApplications };
  }

  /**
   * Handle application submitted events
   */
  protected async handleApplicationSubmitted(event: WebhookEvent): Promise<{ updatedApplications: string[] }> {
    const { externalApplicationId, submittedDate } = event.data;
    const updatedApplications: string[] = [];

    try {
      const mapping = await prisma.externalApplicationMapping.findFirst({
        where: {
          externalApplicationId,
          integration: {
            provider: this.integrationName
          }
        }
      });

      if (mapping) {
        await prisma.application.update({
          where: { id: mapping.applicationId },
          data: {
            status: 'submitted',
            submittedDate: new Date(submittedDate)
          }
        });

        updatedApplications.push(mapping.applicationId);
      }
    } catch (error) {
      console.error('Failed to handle application submitted:', error);
      throw error;
    }

    return { updatedApplications };
  }

  /**
   * Handle decision received events
   */
  protected async handleDecisionReceived(event: WebhookEvent): Promise<{ updatedApplications: string[] }> {
    const { externalApplicationId, decision, decisionDate } = event.data;
    const updatedApplications: string[] = [];

    try {
      const mapping = await prisma.externalApplicationMapping.findFirst({
        where: {
          externalApplicationId,
          integration: {
            provider: this.integrationName
          }
        }
      });

      if (mapping) {
        const internalDecision = this.mapExternalDecision(decision);
        
        await prisma.application.update({
          where: { id: mapping.applicationId },
          data: {
            status: 'decided',
            decisionType: internalDecision,
            decisionDate: new Date(decisionDate)
          }
        });

        updatedApplications.push(mapping.applicationId);
      }
    } catch (error) {
      console.error('Failed to handle decision received:', error);
      throw error;
    }

    return { updatedApplications };
  }

  /**
   * Handle document uploaded events
   */
  protected async handleDocumentUploaded(event: WebhookEvent): Promise<{ updatedApplications: string[] }> {
    // Base implementation - can be overridden by specific integrations
    return { updatedApplications: [] };
  }

  // Abstract methods that must be implemented by specific integrations
  protected abstract parseWebhookEvent(payload: any): WebhookEvent | null;
  protected abstract mapExternalStatus(externalStatus: string): string;
  protected abstract mapExternalDecision(externalDecision: string): string;
  protected abstract supportsSignatureValidation(): boolean;
  protected abstract extractSignature(headers: Record<string, string>): string | null;
  protected abstract validateSignature(payload: any, signature: string): boolean;

  // Helper methods
  private async isEventProcessed(eventId: string): Promise<boolean> {
    // For now, we'll use a simple in-memory cache or database check
    // In production, you might want to use Redis or a dedicated table
    const processed = await prisma.integration.findFirst({
      where: {
        integrationData: {
          contains: eventId
        }
      }
    });

    return !!processed;
  }

  private async markEventProcessed(eventId: string, result: ProcessedWebhook): Promise<void> {
    // Store processed event information
    // This is a simplified implementation - in production you might want a dedicated table
    console.log(`Marked event ${eventId} as processed:`, result);
  }
}