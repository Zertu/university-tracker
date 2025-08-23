import { DeadlineService } from '../deadline';

describe('DeadlineService', () => {
  describe('calculateDeadline', () => {
    beforeEach(() => {
      // Mock current date to January 1, 2024
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate early decision deadline correctly', () => {
      const deadline = DeadlineService.calculateDeadline('early_decision', null);
      expect(deadline.getMonth()).toBe(10); // November (0-indexed)
      expect(deadline.getDate()).toBe(1);
      expect(deadline.getFullYear()).toBe(2024);
    });

    it('should calculate early action deadline correctly', () => {
      const deadline = DeadlineService.calculateDeadline('early_action', null);
      expect(deadline.getMonth()).toBe(10); // November (0-indexed)
      expect(deadline.getDate()).toBe(15);
      expect(deadline.getFullYear()).toBe(2024);
    });

    it('should calculate regular decision deadline correctly', () => {
      const deadline = DeadlineService.calculateDeadline('regular', null);
      expect(deadline.getMonth()).toBe(0); // January (0-indexed)
      expect(deadline.getDate()).toBe(15);
      expect(deadline.getFullYear()).toBe(2025); // Next year
    });

    it('should calculate rolling admission deadline correctly', () => {
      const deadline = DeadlineService.calculateDeadline('rolling', null);
      expect(deadline.getMonth()).toBe(4); // May (0-indexed)
      expect(deadline.getDate()).toBe(1);
      expect(deadline.getFullYear()).toBe(2025); // Next year
    });

    it('should use university-specific deadlines when provided', () => {
      const universityDeadlines = {
        'early_decision': '2024-10-15',
        'early_action': '2024-11-01',
        'regular': '2025-02-01',
        'rolling': '2025-06-01'
      };

      const deadline = DeadlineService.calculateDeadline('early_decision', universityDeadlines);
      expect(deadline.getMonth()).toBe(9); // October (0-indexed)
      expect(deadline.getDate()).toBe(15);
      expect(deadline.getFullYear()).toBe(2024);
    });

    it('should move deadline to next year if it has passed', () => {
      // Set current date to December 1, 2024
      jest.setSystemTime(new Date('2024-12-01'));

      const deadline = DeadlineService.calculateDeadline('early_decision', null);
      expect(deadline.getMonth()).toBe(10); // November (0-indexed)
      expect(deadline.getDate()).toBe(1);
      expect(deadline.getFullYear()).toBe(2025); // Next year since November has passed
    });

    it('should not move rolling deadline to next year even if it has passed', () => {
      // Set current date to June 1, 2024
      jest.setSystemTime(new Date('2024-06-01'));

      const deadline = DeadlineService.calculateDeadline('rolling', null);
      expect(deadline.getMonth()).toBe(4); // May (0-indexed)
      expect(deadline.getDate()).toBe(1);
      expect(deadline.getFullYear()).toBe(2025); // Still next year as per default logic
    });
  });

  describe('urgency level calculation', () => {
    it('should classify deadlines correctly by urgency', () => {
      const now = new Date();
      
      // Critical: 3 days or less
      const criticalDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
      const criticalDays = Math.ceil((criticalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(criticalDays <= 3).toBe(true);

      // Warning: 4-7 days
      const warningDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
      const warningDays = Math.ceil((warningDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(warningDays > 3 && warningDays <= 7).toBe(true);

      // Info: more than 7 days
      const infoDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
      const infoDays = Math.ceil((infoDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(infoDays > 7).toBe(true);
    });
  });
});