import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../notification';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  })),
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    notificationService = new NotificationService();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        type: 'deadline_reminder',
        title: 'Test Notification',
        message: 'Test message',
        read: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await notificationService.createNotification({
        userId: 'user-1',
        type: 'deadline_reminder',
        title: 'Test Notification',
        message: 'Test message',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Test Notification',
          message: 'Test message',
          read: false,
        },
      });
      expect(result).toEqual(mockNotification);
    });

    it('should handle creation errors', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('Database error'));

      await expect(
        notificationService.createNotification({
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Test Notification',
          message: 'Test message',
        })
      ).rejects.toThrow('Failed to create notification');
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications with default options', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Test Notification',
          message: 'Test message',
          read: false,
          createdAt: new Date(),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications('user-1');

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockNotifications);
    });

    it('should fetch unread notifications only', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Test Notification',
          message: 'Test message',
          read: false,
          createdAt: new Date(),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications('user-1', {
        unreadOnly: true,
        limit: 10,
        offset: 5,
      });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5,
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await notificationService.markAsRead('notification-1', 'user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
          userId: 'user-1',
        },
        data: {
          read: true,
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await notificationService.markAsRead('notification-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await notificationService.markAllAsRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: {
          read: true,
        },
      });
      expect(result).toBe(5);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await notificationService.getUnreadCount('user-1');

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      const result = await notificationService.deleteNotification('notification-1', 'user-1');

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
          userId: 'user-1',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if notification not found', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });

      const result = await notificationService.deleteNotification('notification-1', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('createDeadlineReminder', () => {
    it('should create deadline reminder notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        type: 'deadline_reminder',
        title: 'Application Deadline Approaching',
        message: 'Your application to Test University is due in 7 days (1/15/2024)',
        read: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const deadline = new Date('2024-01-15');
      const result = await notificationService.createDeadlineReminder(
        'user-1',
        'application-1',
        deadline,
        'Test University'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Application Deadline Approaching',
          message: expect.stringContaining('Test University'),
          read: false,
        },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('createStatusChangeNotification', () => {
    it('should create status change notification', async () => {
      const mockNotification = {
        id: 'notification-1',
        userId: 'user-1',
        type: 'status_update',
        title: 'Application Status Updated',
        message: 'Your application to Test University status changed from "In Progress" to "Submitted"',
        read: false,
        createdAt: new Date(),
      };

      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      const result = await notificationService.createStatusChangeNotification(
        'user-1',
        'application-1',
        'Test University',
        'in_progress',
        'submitted'
      );

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'status_update',
          title: 'Application Status Updated',
          message: 'Your application to Test University status changed from "In Progress" to "Submitted"',
          read: false,
        },
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('batchCreateNotifications', () => {
    it('should create multiple notifications', async () => {
      const mockNotifications = [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'deadline_reminder',
          title: 'Test 1',
          message: 'Message 1',
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'notification-2',
          userId: 'user-1',
          type: 'status_update',
          title: 'Test 2',
          message: 'Message 2',
          read: false,
          createdAt: new Date(),
        },
      ];

      mockPrisma.notification.create
        .mockResolvedValueOnce(mockNotifications[0])
        .mockResolvedValueOnce(mockNotifications[1]);

      const notificationsData = [
        {
          userId: 'user-1',
          type: 'deadline_reminder' as const,
          title: 'Test 1',
          message: 'Message 1',
        },
        {
          userId: 'user-1',
          type: 'status_update' as const,
          title: 'Test 2',
          message: 'Message 2',
        },
      ];

      const result = await notificationService.batchCreateNotifications(notificationsData);

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old read notifications', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 10 });

      const result = await notificationService.cleanupOldNotifications();

      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          read: true,
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
      expect(result).toBe(10);
    });
  });
});