/**
 * CommonApp API client implementation
 */

import { CommonAppAuth } from './auth';
import type { 
  CommonAppClientConfig, 
  CommonAppApplication, 
  CommonAppCollege, 
  CommonAppRequirement,
  CommonAppUser,
  CommonAppError
} from './types';

export class CommonAppClient {
  private config: CommonAppClientConfig;
  private auth: CommonAppAuth;
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: CommonAppClientConfig, auth: CommonAppAuth) {
    this.config = config;
    this.auth = auth;
  }

  /**
   * Get user's applications from CommonApp
   */
  async getApplications(userId: string): Promise<CommonAppApplication[]> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppApplication[]>(
      '/applications',
      { method: 'GET' },
      accessToken
    );
  }

  /**
   * Get specific application details
   */
  async getApplication(userId: string, applicationId: string): Promise<CommonAppApplication> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppApplication>(
      `/applications/${applicationId}`,
      { method: 'GET' },
      accessToken
    );
  }

  /**
   * Create new application in CommonApp
   */
  async createApplication(
    userId: string, 
    applicationData: Partial<CommonAppApplication>
  ): Promise<CommonAppApplication> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppApplication>(
      '/applications',
      {
        method: 'POST',
        body: JSON.stringify(applicationData)
      },
      accessToken
    );
  }

  /**
   * Update existing application in CommonApp
   */
  async updateApplication(
    userId: string, 
    applicationId: string, 
    updates: Partial<CommonAppApplication>
  ): Promise<CommonAppApplication> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppApplication>(
      `/applications/${applicationId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      },
      accessToken
    );
  }

  /**
   * Submit application to CommonApp
   */
  async submitApplication(userId: string, applicationId: string): Promise<CommonAppApplication> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppApplication>(
      `/applications/${applicationId}/submit`,
      { method: 'POST' },
      accessToken
    );
  }

  /**
   * Get application requirements
   */
  async getApplicationRequirements(
    userId: string, 
    applicationId: string
  ): Promise<CommonAppRequirement[]> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppRequirement[]>(
      `/applications/${applicationId}/requirements`,
      { method: 'GET' },
      accessToken
    );
  }

  /**
   * Update requirement status
   */
  async updateRequirement(
    userId: string, 
    requirementId: string, 
    updates: Partial<CommonAppRequirement>
  ): Promise<CommonAppRequirement> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppRequirement>(
      `/requirements/${requirementId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      },
      accessToken
    );
  }

  /**
   * Get available colleges from CommonApp
   */
  async getColleges(userId: string, filters?: {
    state?: string;
    country?: string;
    search?: string;
  }): Promise<CommonAppCollege[]> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    const queryParams = new URLSearchParams();
    if (filters?.state) queryParams.set('state', filters.state);
    if (filters?.country) queryParams.set('country', filters.country);
    if (filters?.search) queryParams.set('search', filters.search);
    
    const url = `/colleges${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return this.makeRequest<CommonAppCollege[]>(url, { method: 'GET' }, accessToken);
  }

  /**
   * Get specific college details
   */
  async getCollege(userId: string, collegeId: string): Promise<CommonAppCollege> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppCollege>(
      `/colleges/${collegeId}`,
      { method: 'GET' },
      accessToken
    );
  }

  /**
   * Get user profile from CommonApp
   */
  async getUserProfile(userId: string): Promise<CommonAppUser> {
    const accessToken = await this.auth.getValidAccessToken(userId);
    
    return this.makeRequest<CommonAppUser>('/user', { method: 'GET' }, accessToken);
  }

  /**
   * Make authenticated request to CommonApp API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    accessToken: string
  ): Promise<T> {
    // Check rate limits
    await this.checkRateLimit();

    const url = `${this.config.baseUrl}/${this.config.apiVersion}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'UniversityTracker/1.0',
        ...options.headers
      },
      timeout: this.config.timeout
    };

    let lastError: any;
    
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        
        // Update rate limit tracking
        this.updateRateLimitTracking(response);
        
        if (!response.ok) {
          const errorData: CommonAppError = await response.json().catch(() => ({
            error: 'unknown_error',
            error_description: `HTTP ${response.status}: ${response.statusText}`,
            error_code: response.status
          }));
          
          // Don't retry client errors (4xx) except 429 (rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`CommonApp API error: ${errorData.error_description}`);
          }
          
          // For server errors (5xx) and rate limits, we'll retry
          if (attempt === this.config.retryAttempts) {
            throw new Error(`CommonApp API error after ${this.config.retryAttempts} retries: ${errorData.error_description}`);
          }
          
          lastError = new Error(errorData.error_description);
          
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return {} as T;
        }
        
        const data = await response.json();
        return data;
        
      } catch (error) {
        lastError = error;
        
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        // Wait before retrying
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const minuteKey = `minute_${Math.floor(now / 60000)}`;
    const hourKey = `hour_${Math.floor(now / 3600000)}`;
    
    const minuteTracker = this.rateLimitTracker.get(minuteKey) || { count: 0, resetTime: now + 60000 };
    const hourTracker = this.rateLimitTracker.get(hourKey) || { count: 0, resetTime: now + 3600000 };
    
    // Clean up old entries
    for (const [key, tracker] of this.rateLimitTracker.entries()) {
      if (tracker.resetTime < now) {
        this.rateLimitTracker.delete(key);
      }
    }
    
    // Check limits
    if (minuteTracker.count >= this.config.rateLimits.requestsPerMinute) {
      const waitTime = minuteTracker.resetTime - now;
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (hourTracker.count >= this.config.rateLimits.requestsPerHour) {
      const waitTime = hourTracker.resetTime - now;
      if (waitTime > 0) {
        console.log(`Hourly rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Update counters
    minuteTracker.count++;
    hourTracker.count++;
    this.rateLimitTracker.set(minuteKey, minuteTracker);
    this.rateLimitTracker.set(hourKey, hourTracker);
  }

  /**
   * Update rate limit tracking based on response headers
   */
  private updateRateLimitTracking(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining && reset) {
      const resetTime = parseInt(reset) * 1000; // Convert to milliseconds
      const now = Date.now();
      const minuteKey = `minute_${Math.floor(now / 60000)}`;
      
      this.rateLimitTracker.set(minuteKey, {
        count: this.config.rateLimits.requestsPerMinute - parseInt(remaining),
        resetTime
      });
    }
  }
}