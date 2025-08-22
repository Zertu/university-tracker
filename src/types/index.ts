// Core user types
export interface User {
  id: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  graduationYear?: number;
  gpa?: number;
  satScore?: number;
  actScore?: number;
  targetCountries: string[];
  intendedMajors: string[];
}

// University and application types
export interface University {
  id: string;
  name: string;
  country: string;
  state?: string;
  city: string;
  usNewsRanking?: number;
  acceptanceRate?: number;
  applicationSystem: 'Common App' | 'Coalition' | 'Direct';
  tuitionInState?: number;
  tuitionOutState?: number;
  applicationFee?: number;
  deadlines: {
    early_decision?: string;
    early_action?: string;
    regular?: string;
  };
  majorsOffered: string[];
  websiteUrl?: string;
}

export interface Application {
  id: string;
  studentId: string;
  universityId: string;
  applicationType: 'early_decision' | 'early_action' | 'regular' | 'rolling';
  deadline: Date;
  status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'decided';
  submittedDate?: Date;
  decisionDate?: Date;
  decisionType?: 'accepted' | 'rejected' | 'waitlisted';
  notes?: string;
  university?: University;
  requirements?: ApplicationRequirement[];
}

export interface ApplicationRequirement {
  id: string;
  applicationId: string;
  requirementType: 'essay' | 'recommendation' | 'transcript' | 'test_scores';
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  deadline?: Date;
  notes?: string;
}

// Third-party integration types
export interface Integration {
  id: string;
  userId: string;
  provider: 'commonapp' | 'coalition' | 'direct';
  externalUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  integrationData?: Record<string, unknown>; // Provider-specific data
}

export interface ExternalApplicationMapping {
  id: string;
  applicationId: string;
  integrationId: string;
  externalApplicationId: string;
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncedAt?: Date;
  syncErrorMessage?: string;
}