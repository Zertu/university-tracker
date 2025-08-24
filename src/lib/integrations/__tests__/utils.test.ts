/**
 * Tests for Integration Utilities
 */

import { StatusMappings, TokenUtils, IntegrationDataUtils, ErrorUtils } from '../utils';

describe('StatusMappings', () => {
  describe('mapToInternalStatus', () => {
    it('should map CommonApp statuses correctly', () => {
      expect(StatusMappings.mapToInternalStatus('not_started', 'commonapp')).toBe('not_started');
      expect(StatusMappings.mapToInternalStatus('in_progress', 'commonapp')).toBe('in_progress');
      expect(StatusMappings.mapToInternalStatus('submitted', 'commonapp')).toBe('submitted');
      expect(StatusMappings.mapToInternalStatus('under_review', 'commonapp')).toBe('under_review');
      expect(StatusMappings.mapToInternalStatus('decision_made', 'commonapp')).toBe('decided');
    });

    it('should map Coalition statuses correctly', () => {
      expect(StatusMappings.mapToInternalStatus('draft', 'coalition')).toBe('not_started');
      expect(StatusMappings.mapToInternalStatus('in_progress', 'coalition')).toBe('in_progress');
      expect(StatusMappings.mapToInternalStatus('submitted', 'coalition')).toBe('submitted');
      expect(StatusMappings.mapToInternalStatus('reviewing', 'coalition')).toBe('under_review');
      expect(StatusMappings.mapToInternalStatus('decided', 'coalition')).toBe('decided');
    });

    it('should return original status for unknown provider', () => {
      expect(StatusMappings.mapToInternalStatus('custom_status', 'unknown')).toBe('custom_status');
    });

    it('should return original status for unknown status', () => {
      expect(StatusMappings.mapToInternalStatus('unknown_status', 'commonapp')).toBe('unknown_status');
    });
  });

  describe('mapToExternalStatus', () => {
    it('should map internal statuses to CommonApp correctly', () => {
      expect(StatusMappings.mapToExternalStatus('not_started', 'commonapp')).toBe('not_started');
      expect(StatusMappings.mapToExternalStatus('in_progress', 'commonapp')).toBe('in_progress');
      expect(StatusMappings.mapToExternalStatus('submitted', 'commonapp')).toBe('submitted');
      expect(StatusMappings.mapToExternalStatus('under_review', 'commonapp')).toBe('under_review');
      expect(StatusMappings.mapToExternalStatus('decided', 'commonapp')).toBe('decision_made');
    });

    it('should map internal statuses to Coalition correctly', () => {
      expect(StatusMappings.mapToExternalStatus('not_started', 'coalition')).toBe('draft');
      expect(StatusMappings.mapToExternalStatus('in_progress', 'coalition')).toBe('in_progress');
      expect(StatusMappings.mapToExternalStatus('submitted', 'coalition')).toBe('submitted');
      expect(StatusMappings.mapToExternalStatus('under_review', 'coalition')).toBe('reviewing');
      expect(StatusMappings.mapToExternalStatus('decided', 'coalition')).toBe('decided');
    });
  });

  describe('mapToInternalDecision', () => {
    it('should map acceptance decisions correctly', () => {
      expect(StatusMappings.mapToInternalDecision('accepted')).toBe('accepted');
      expect(StatusMappings.mapToInternalDecision('admit')).toBe('accepted');
      expect(StatusMappings.mapToInternalDecision('admitted')).toBe('accepted');
    });

    it('should map rejection decisions correctly', () => {
      expect(StatusMappings.mapToInternalDecision('rejected')).toBe('rejected');
      expect(StatusMappings.mapToInternalDecision('denied')).toBe('rejected');
      expect(StatusMappings.mapToInternalDecision('decline')).toBe('rejected');
    });

    it('should map waitlist decisions correctly', () => {
      expect(StatusMappings.mapToInternalDecision('waitlisted')).toBe('waitlisted');
      expect(StatusMappings.mapToInternalDecision('waitlist')).toBe('waitlisted');
      expect(StatusMappings.mapToInternalDecision('deferred')).toBe('waitlisted');
    });

    it('should return original decision for unknown types', () => {
      expect(StatusMappings.mapToInternalDecision('unknown')).toBe('unknown');
    });
  });
});

describe('TokenUtils', () => {
  describe('isTokenExpired', () => {
    it('should return true for expired token', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      expect(TokenUtils.isTokenExpired(pastDate)).toBe(true);
    });

    it('should return false for valid token', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      expect(TokenUtils.isTokenExpired(futureDate)).toBe(false);
    });

    it('should consider buffer time', () => {
      const nearFutureDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      expect(TokenUtils.isTokenExpired(nearFutureDate, 5)).toBe(true); // 5 minute buffer
      expect(TokenUtils.isTokenExpired(nearFutureDate, 1)).toBe(false); // 1 minute buffer
    });
  });

  describe('encryptToken and decryptToken', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'test-token-123';
      const encrypted = TokenUtils.encryptToken(originalToken);
      const decrypted = TokenUtils.decryptToken(encrypted);
      
      expect(encrypted).not.toBe(originalToken);
      expect(decrypted).toBe(originalToken);
    });
  });
});

describe('IntegrationDataUtils', () => {
  describe('parseIntegrationData', () => {
    it('should parse valid JSON', () => {
      const jsonString = '{"key": "value", "number": 123}';
      const result = IntegrationDataUtils.parseIntegrationData(jsonString);
      expect(result).toEqual({ key: 'value', number: 123 });
    });

    it('should return empty object for null input', () => {
      const result = IntegrationDataUtils.parseIntegrationData(null);
      expect(result).toEqual({});
    });

    it('should return empty object for invalid JSON', () => {
      const result = IntegrationDataUtils.parseIntegrationData('invalid json');
      expect(result).toEqual({});
    });
  });

  describe('stringifyIntegrationData', () => {
    it('should stringify object correctly', () => {
      const data = { key: 'value', number: 123 };
      const result = IntegrationDataUtils.stringifyIntegrationData(data);
      expect(result).toBe('{"key":"value","number":123}');
    });

    it('should return empty object string for unstringifiable data', () => {
      const circularData: any = {};
      circularData.self = circularData;
      const result = IntegrationDataUtils.stringifyIntegrationData(circularData);
      expect(result).toBe('{}');
    });
  });

  describe('updateIntegrationData', () => {
    it('should merge existing data with updates', () => {
      const existingData = '{"existing": "value", "toUpdate": "old"}';
      const updates = { toUpdate: 'new', newKey: 'newValue' };
      
      const result = IntegrationDataUtils.updateIntegrationData(existingData, updates);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({
        existing: 'value',
        toUpdate: 'new',
        newKey: 'newValue'
      });
    });

    it('should handle null existing data', () => {
      const updates = { key: 'value' };
      const result = IntegrationDataUtils.updateIntegrationData(null, updates);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual({ key: 'value' });
    });
  });
});

describe('ErrorUtils', () => {
  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const networkError = { code: 'ENOTFOUND' };
      const result = ErrorUtils.categorizeError(networkError);
      
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Network connection failed');
    });

    it('should categorize authentication errors', () => {
      const authError = { status: 401 };
      const result = ErrorUtils.categorizeError(authError);
      
      expect(result.type).toBe('authentication');
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Authentication failed - please reconnect');
    });

    it('should categorize rate limit errors', () => {
      const rateLimitError = { status: 429 };
      const result = ErrorUtils.categorizeError(rateLimitError);
      
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Rate limit exceeded');
    });

    it('should categorize validation errors', () => {
      const validationError = { status: 400, message: 'Invalid data' };
      const result = ErrorUtils.categorizeError(validationError);
      
      expect(result.type).toBe('validation');
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Invalid data');
    });

    it('should categorize server errors', () => {
      const serverError = { status: 500 };
      const result = ErrorUtils.categorizeError(serverError);
      
      expect(result.type).toBe('network');
      expect(result.retryable).toBe(true);
      expect(result.message).toBe('Server error - will retry');
    });

    it('should categorize unknown errors', () => {
      const unknownError = { message: 'Something went wrong' };
      const result = ErrorUtils.categorizeError(unknownError);
      
      expect(result.type).toBe('data_mapping');
      expect(result.retryable).toBe(false);
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('createUserMessage', () => {
    it('should create user-friendly messages', () => {
      expect(ErrorUtils.createUserMessage({ status: 401 }))
        .toBe('Please reconnect your account to continue syncing.');
      
      expect(ErrorUtils.createUserMessage({ code: 'ENOTFOUND' }))
        .toBe('Connection issue - we\'ll retry automatically.');
      
      expect(ErrorUtils.createUserMessage({ status: 400 }))
        .toBe('There was an issue with your data. Please check and try again.');
      
      expect(ErrorUtils.createUserMessage({ message: 'Unknown error' }))
        .toBe('Something went wrong. Our team has been notified.');
    });
  });
});
