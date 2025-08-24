/**
 * CommonApp-specific types and interfaces
 */

/**
 * CommonApp OAuth configuration
 */
export interface CommonAppOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

/**
 * CommonApp API response types
 */
export interface CommonAppTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface CommonAppUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  graduation_year?: number;
  created_at: string;
  updated_at: string;
}

export interface CommonAppApplication {
  id: string;
  student_id: string;
  college_id: string;
  college_name: string;
  application_type: 'early_decision' | 'early_action' | 'regular_decision';
  status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'decision_made';
  submitted_date?: string;
  decision_date?: string;
  decision: 'accepted' | 'rejected' | 'waitlisted' | null;
  deadline: string;
  requirements: CommonAppRequirement[];
  created_at: string;
  updated_at: string;
}

export interface CommonAppRequirement {
  id: string;
  application_id: string;
  type: 'essay' | 'recommendation' | 'transcript' | 'test_scores' | 'supplement';
  name: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  deadline?: string;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommonAppCollege {
  id: string;
  name: string;
  state: string;
  country: string;
  application_fee: number;
  deadlines: {
    early_decision?: string;
    early_action?: string;
    regular_decision?: string;
  };
  requirements: string[];
  created_at: string;
  updated_at: string;
}

/**
 * CommonApp webhook event types
 */
export interface CommonAppWebhookEvent {
  id: string;
  type: 'application.status_changed' | 'application.submitted' | 'application.decision_received' | 'requirement.completed';
  created_at: string;
  data: {
    application_id: string;
    student_id: string;
    college_id: string;
    previous_status?: string;
    current_status?: string;
    submitted_date?: string;
    decision?: string;
    decision_date?: string;
    requirement_id?: string;
    requirement_type?: string;
  };
}

/**
 * CommonApp API error response
 */
export interface CommonAppError {
  error: string;
  error_description: string;
  error_code: number;
}

/**
 * CommonApp sync data structure
 */
export interface CommonAppSyncData {
  lastSyncAt?: string;
  syncedApplications: string[];
  errorCount: number;
  lastError?: string;
  webhookSecret?: string;
}

/**
 * CommonApp API client configuration
 */
export interface CommonAppClientConfig {
  baseUrl: string;
  apiVersion: string;
  timeout: number;
  retryAttempts: number;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}
