/**
 * CommonApp webhook handler implementation
 */

import crypto from 'crypto';
import { BaseWebhookHandler } from '../base/webhook-handler';
import type { WebhookEvent } from '../base/webhook-handler';
import type { CommonAppWebhookEvent } from './types';
import { CommonAppMapper } from './mapper';

export class CommonAppWebhookHandler extends BaseWebhookHandler {
  private webhookSecret: string;

  constructor(webhookSecret: string) {
    super('commonapp');
    this.webhookSecret = webhookSecret;
  }

  /**
   * Parse CommonApp webhook event
   */
  protected parseWebhookEvent(payload: any): WebhookEvent | null {
    try {
      // CommonApp sends webhook events in a specific format
      const commonAppEvent = payload as CommonAppWebhookEvent;
      
      if (!commonAppEvent.id || !commonAppEvent.type || !commonAppEvent.data) {
        console.error('Invalid CommonApp webhook payload structure');
        return null;
      }

      return {
        id: commonAppEvent.id,
        type: this.mapEventType(commonAppEvent.type),
        timestamp: new Date(commonAppEvent.created_at),
        data: this.mapEventData(commonAppEvent),
        source: 'commonapp'
      };
    } catch (error) {
      console.error('Failed to parse CommonApp webhook event:', error);
      return null;
    }
  }

  /**
   * Map external status to internal status
   */
  protected mapExternalStatus(externalStatus: string): string {
    return CommonAppMapper['mapApplicationStatus'](externalStatus);
  }

  /**
   * Map external decision to internal decision
   */
  protected mapExternalDecision(externalDecision: string): string {
    return CommonAppMapper['mapDecisionType'](externalDecision);
  }

  /**
   * Check if signature validation is supported
   */
  protected supportsSignatureValidation(): boolean {
    return !!this.webhookSecret;
  }

  /**
   * Extract signature from headers
   */
  protected extractSignature(headers: Record<string, string>): string | null {
    // CommonApp typically sends signature in X-CommonApp-Signature header
    return headers['x-commonapp-signature'] || headers['X-CommonApp-Signature'] || null;
  }

  /**
   * Validate webhook signature
   */
  protected validateSignature(payload: any, signature: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    try {
      // CommonApp uses HMAC-SHA256 for webhook signatures
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString, 'utf8')
        .digest('hex');

      // CommonApp signature format: "sha256=<hash>"
      const providedSignature = signature.startsWith('sha256=') 
        ? signature.slice(7) 
        : signature;

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature validation failed:', error);
      return false;
    }
  }

  /**
   * Handle CommonApp-specific document uploaded events
   */
  protected async handleDocumentUploaded(event: WebhookEvent): Promise<{ updatedApplications: string[] }> {
    const { externalApplicationId, requirementId, requirementType } = event.data;
    const updatedApplications: string[] = [];

    try {
      // Find the corresponding local application
      const mapping = await this.findApplicationMapping(externalApplicationId);
      if (!mapping) {
        console.warn(`No mapping found for external application: ${externalApplicationId}`);
        return { updatedApplications };
      }

      // Update the corresponding requirement status
      if (requirementId && requirementType) {
        await this.updateRequirementStatus(
          mapping.applicationId,
          requirementType,
          'completed'
        );
        updatedApplications.push(mapping.applicationId);
      }

    } catch (error) {
      console.error('Failed to handle document uploaded event:', error);
      throw error;
    }

    return { updatedApplications };
  }

  // Private helper methods

  private mapEventType(commonAppEventType: string): string {
    const eventTypeMap: Record<string, string> = {
      'application.status_changed': 'application.status_changed',
      'application.submitted': 'application.submitted',
      'application.decision_received': 'application.decision_received',
      'requirement.completed': 'document.uploaded'
    };

    return eventTypeMap[commonAppEventType] || commonAppEventType;
  }

  private mapEventData(commonAppEvent: CommonAppWebhookEvent): any {
    const baseData = {
      externalApplicationId: commonAppEvent.data.application_id,
      studentId: commonAppEvent.data.student_id,
      collegeId: commonAppEvent.data.college_id,
      timestamp: commonAppEvent.created_at
    };

    switch (commonAppEvent.type) {
      case 'application.status_changed':
        return {
          ...baseData,
          previousStatus: commonAppEvent.data.previous_status,
          newStatus: commonAppEvent.data.current_status
        };

      case 'application.submitted':
        return {
          ...baseData,
          submittedDate: commonAppEvent.data.submitted_date
        };

      case 'application.decision_received':
        return {
          ...baseData,
          decision: commonAppEvent.data.decision,
          decisionDate: commonAppEvent.data.decision_date
        };

      case 'requirement.completed':
        return {
          ...baseData,
          requirementId: commonAppEvent.data.requirement_id,
          requirementType: commonAppEvent.data.requirement_type
        };

      default:
        return baseData;
    }
  }

  private async findApplicationMapping(externalApplicationId: string) {
    const { prisma } = await import('@/lib/prisma');
    
    return prisma.externalApplicationMapping.findFirst({
      where: {
        externalApplicationId,
        integration: {
          provider: 'commonapp'
        }
      },
      include: {
        application: true,
        integration: true
      }
    });
  }

  private async updateRequirementStatus(
    applicationId: string,
    requirementType: string,
    status: string
  ): Promise<void> {
    const { prisma } = await import('@/lib/prisma');
    
    // Map CommonApp requirement type to internal type
    const internalType = this.mapRequirementType(requirementType);
    
    await prisma.applicationRequirement.updateMany({
      where: {
        applicationId,
        requirementType: internalType
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  private mapRequirementType(commonAppType: string): string {
    const typeMap: Record<string, string> = {
      'essay': 'essay',
      'recommendation': 'recommendation',
      'transcript': 'transcript',
      'test_scores': 'test_scores',
      'supplement': 'essay'
    };
    return typeMap[commonAppType] || 'essay';
  }
}
