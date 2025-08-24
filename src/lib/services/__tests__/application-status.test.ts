import { ApplicationStatusService } from '../application-status';
import { ApplicationStatus } from '@/lib/validations/application';

describe('ApplicationStatusService', () => {
  describe('validateStatusTransition', () => {
    it('should allow valid transitions from not_started', () => {
      const result = ApplicationStatusService.validateStatusTransition('not_started', 'in_progress');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid transitions from not_started', () => {
      const result = ApplicationStatusService.validateStatusTransition('not_started', 'submitted');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });

    it('should allow valid transitions from in_progress', () => {
      const result1 = ApplicationStatusService.validateStatusTransition('in_progress', 'submitted');
      expect(result1.valid).toBe(true);

      const result2 = ApplicationStatusService.validateStatusTransition('in_progress', 'not_started');
      expect(result2.valid).toBe(true);
    });

    it('should reject transitions from decided status', () => {
      const result = ApplicationStatusService.validateStatusTransition('decided', 'submitted');
      expect(result.valid).toBe(false);
    });
  });

  describe('getNextPossibleStatuses', () => {
    it('should return correct next statuses for not_started', () => {
      const nextStatuses = ApplicationStatusService.getNextPossibleStatuses('not_started');
      expect(nextStatuses).toEqual(['in_progress']);
    });

    it('should return correct next statuses for in_progress', () => {
      const nextStatuses = ApplicationStatusService.getNextPossibleStatuses('in_progress');
      expect(nextStatuses).toEqual(['submitted', 'not_started']);
    });

    it('should return empty array for decided status', () => {
      const nextStatuses = ApplicationStatusService.getNextPossibleStatuses('decided');
      expect(nextStatuses).toEqual([]);
    });
  });

  describe('getStatusInfo', () => {
    it('should return correct status info for all statuses', () => {
      const statuses: ApplicationStatus[] = ['not_started', 'in_progress', 'submitted', 'under_review', 'decided'];
      
      statuses.forEach(status => {
        const info = ApplicationStatusService.getStatusInfo(status);
        expect(info).toHaveProperty('label');
        expect(info).toHaveProperty('color');
        expect(info).toHaveProperty('description');
        expect(info).toHaveProperty('icon');
        expect(typeof info.label).toBe('string');
        expect(typeof info.color).toBe('string');
        expect(typeof info.description).toBe('string');
        expect(typeof info.icon).toBe('string');
      });
    });
  });
});
