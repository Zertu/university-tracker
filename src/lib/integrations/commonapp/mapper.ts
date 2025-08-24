/**
 * Data mapping utilities between CommonApp and internal data structures
 */

import type { Application, ApplicationRequirement } from '@prisma/client';
import type { 
  CommonAppApplication, 
  CommonAppRequirement, 
  CommonAppCollege 
} from './types';
import type { SyncableApplication, ExternalApplication } from '../base/sync-service';

export class CommonAppMapper {
  /**
   * Map CommonApp application to internal application format
   */
  static mapToInternalApplication(
    commonAppApp: CommonAppApplication,
    universityId?: string
  ): Partial<Application> {
    return {
      universityId: universityId || commonAppApp.college_id,
      applicationType: this.mapApplicationType(commonAppApp.application_type),
      status: this.mapApplicationStatus(commonAppApp.status),
      deadline: new Date(commonAppApp.deadline),
      submittedDate: commonAppApp.submitted_date ? new Date(commonAppApp.submitted_date) : null,
      decisionDate: commonAppApp.decision_date ? new Date(commonAppApp.decision_date) : null,
      decisionType: commonAppApp.decision ? this.mapDecisionType(commonAppApp.decision) : null,
      updatedAt: new Date(commonAppApp.updated_at)
    };
  }

  /**
   * Map internal application to CommonApp format
   */
  static mapToCommonAppApplication(
    internalApp: SyncableApplication,
    collegeId?: string
  ): Partial<CommonAppApplication> {
    return {
      college_id: collegeId || internalApp.universityId,
      application_type: this.mapToCommonAppApplicationType(internalApp.applicationType) as "early_decision" | "early_action" | "regular_decision",
      status: this.mapToCommonAppStatus(internalApp.status) as "not_started" | "in_progress" | "submitted" | "under_review" | "decision_made",
      deadline: internalApp.deadline.toISOString(),
      submitted_date: internalApp.submittedDate?.toISOString(),
      decision_date: internalApp.decisionDate?.toISOString(),
      decision: internalApp.decisionType ? this.mapToCommonAppDecision(internalApp.decisionType) as "accepted" | "rejected" | "waitlisted" : null
    };
  }

  /**
   * Map CommonApp application to external application format for sync service
   */
  static mapToExternalApplication(commonAppApp: CommonAppApplication): ExternalApplication {
    return {
      id: commonAppApp.id,
      universityId: commonAppApp.college_id,
      status: this.mapApplicationStatus(commonAppApp.status),
      submittedDate: commonAppApp.submitted_date ? new Date(commonAppApp.submitted_date) : undefined,
      decisionDate: commonAppApp.decision_date ? new Date(commonAppApp.decision_date) : undefined,
      decisionType: commonAppApp.decision ? this.mapDecisionType(commonAppApp.decision) : undefined,
      lastModified: new Date(commonAppApp.updated_at),
      metadata: {
        college_name: commonAppApp.college_name,
        application_type: commonAppApp.application_type,
        requirements_count: commonAppApp.requirements?.length || 0
      }
    };
  }

  /**
   * Map CommonApp requirement to internal requirement format
   */
  static mapToInternalRequirement(
    commonAppReq: CommonAppRequirement,
    applicationId: string
  ): Partial<ApplicationRequirement> {
    return {
      applicationId,
      requirementType: this.mapRequirementType(commonAppReq.type),
      title: commonAppReq.name,
      description: commonAppReq.description,
      status: this.mapRequirementStatus(commonAppReq.status),
      deadline: commonAppReq.deadline ? new Date(commonAppReq.deadline) : null
    };
  }

  /**
   * Map internal requirement to CommonApp format
   */
  static mapToCommonAppRequirement(
    internalReq: ApplicationRequirement
  ): Partial<CommonAppRequirement> {
    return {
      type: this.mapToCommonAppRequirementType(internalReq.requirementType) as "essay" | "recommendation" | "transcript" | "test_scores" | "supplement",
      name: internalReq.title,
      description: internalReq.description || undefined,
      status: this.mapToCommonAppRequirementStatus(internalReq.status) as "not_started" | "in_progress" | "completed",
      deadline: internalReq.deadline?.toISOString(),
      required: true // Assume all requirements are required by default
    };
  }

  /**
   * Check if two applications represent the same application
   */
  static matchApplications(
    internalApp: SyncableApplication,
    externalApp: ExternalApplication
  ): boolean {
    // Match by university ID and application type
    return internalApp.universityId === externalApp.universityId;
  }

  // Private mapping methods

  private static mapApplicationType(commonAppType: string): string {
    const typeMap: Record<string, string> = {
      'early_decision': 'early_decision',
      'early_action': 'early_action',
      'regular_decision': 'regular',
      'rolling': 'rolling'
    };
    return typeMap[commonAppType] || 'regular';
  }

  private static mapToCommonAppApplicationType(internalType: string): string {
    const typeMap: Record<string, string> = {
      'early_decision': 'early_decision',
      'early_action': 'early_action',
      'regular': 'regular_decision',
      'rolling': 'rolling'
    };
    return typeMap[internalType] || 'regular_decision';
  }

  private static mapApplicationStatus(commonAppStatus: string): string {
    const statusMap: Record<string, string> = {
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'submitted': 'submitted',
      'under_review': 'under_review',
      'decision_made': 'decided'
    };
    return statusMap[commonAppStatus] || commonAppStatus;
  }

  private static mapToCommonAppStatus(internalStatus: string): string {
    const statusMap: Record<string, string> = {
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'submitted': 'submitted',
      'under_review': 'under_review',
      'decided': 'decision_made'
    };
    return statusMap[internalStatus] || internalStatus;
  }

  private static mapDecisionType(commonAppDecision: string): string {
    const decisionMap: Record<string, string> = {
      'accepted': 'accepted',
      'rejected': 'rejected',
      'waitlisted': 'waitlisted'
    };
    return decisionMap[commonAppDecision] || commonAppDecision;
  }

  private static mapToCommonAppDecision(internalDecision: string): string {
    const decisionMap: Record<string, string> = {
      'accepted': 'accepted',
      'rejected': 'rejected',
      'waitlisted': 'waitlisted'
    };
    return decisionMap[internalDecision] || internalDecision;
  }

  private static mapRequirementType(commonAppType: string): string {
    const typeMap: Record<string, string> = {
      'essay': 'essay',
      'recommendation': 'recommendation',
      'transcript': 'transcript',
      'test_scores': 'test_scores',
      'supplement': 'essay' // Map supplements to essays
    };
    return typeMap[commonAppType] || 'essay';
  }

  private static mapToCommonAppRequirementType(internalType: string): string {
    const typeMap: Record<string, string> = {
      'essay': 'essay',
      'recommendation': 'recommendation',
      'transcript': 'transcript',
      'test_scores': 'test_scores'
    };
    return typeMap[internalType] || 'essay';
  }

  private static mapRequirementStatus(commonAppStatus: string): string {
    const statusMap: Record<string, string> = {
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'completed': 'completed'
    };
    return statusMap[commonAppStatus] || commonAppStatus;
  }

  private static mapToCommonAppRequirementStatus(internalStatus: string): string {
    const statusMap: Record<string, string> = {
      'not_started': 'not_started',
      'in_progress': 'in_progress',
      'completed': 'completed'
    };
    return statusMap[internalStatus] || internalStatus;
  }

  /**
   * Validate that a CommonApp application has required fields
   */
  static validateCommonAppApplication(app: Partial<CommonAppApplication>): string[] {
    const errors: string[] = [];

    if (!app.college_id) {
      errors.push('College ID is required');
    }

    if (!app.application_type) {
      errors.push('Application type is required');
    }

    if (!app.deadline) {
      errors.push('Deadline is required');
    }

    return errors;
  }

  /**
   * Validate that an internal application can be mapped to CommonApp
   */
  static validateInternalApplication(app: SyncableApplication): string[] {
    const errors: string[] = [];

    if (!app.universityId) {
      errors.push('University ID is required');
    }

    if (!app.applicationType) {
      errors.push('Application type is required');
    }

    if (!app.deadline) {
      errors.push('Deadline is required');
    }

    return errors;
  }
}
