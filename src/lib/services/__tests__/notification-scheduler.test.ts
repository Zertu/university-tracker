import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NotificationScheduler } from '../notification-scheduler';
import { notificationService } from '../notification';

// Mock Prisma
vi.mock('@prisma/client', () => ({
    PrismaClient: vi.fn(() => ({
        user: {
            findMany: vi.fn(),
        },
        application: {
            findUnique: vi.fn(),
        },
        notification: {
            findFirst: vi.fn(),
        },
        parentChildLink: {
            findMany: vi.fn(),
        },
    })),
}));

// Mock notification service
vi.mock('../notification', () => ({
    notificationService: {
        getUserPreferences: vi.fn(),
        batchCreateNotifications: vi.fn(),
        createNotification: vi.fn(),
        cleanupOldNotifications: vi.fn(),
    },
}));

describe('NotificationScheduler', () => {
    let scheduler: NotificationScheduler;
    let mockPrisma: any;

    beforeEach(() => {
        scheduler = new NotificationScheduler();
        mockPrisma = new PrismaClient();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('processDeadlineReminders', () => {
        it('should process deadline reminders for users with enabled preferences', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    applications: [
                        {
                            id: 'app-1',
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                            university: { name: 'Test University' },
                            requirements: [],
                        },
                    ],
                },
            ];

            const mockPreferences = {
                deadlineReminders: true,
                reminderDaysBefore: 7,
            };

            mockPrisma.user.findMany.mockResolvedValue(mockUsers);
            mockPrisma.notification.findFirst.mockResolvedValue(null); // No existing notification
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.batchCreateNotifications).mockResolvedValue([]);

            const result = await scheduler.processDeadlineReminders();

            expect(mockPrisma.user.findMany).toHaveBeenCalled();
            expect(notificationService.getUserPreferences).toHaveBeenCalledWith('user-1');
            expect(notificationService.batchCreateNotifications).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: 'user-1',
                    type: 'deadline_reminder',
                    title: 'Application Deadline Approaching',
                    message: expect.stringContaining('Test University'),
                }),
            ]);
            expect(result).toBe(1);
        });

        it('should skip users with disabled deadline reminders', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    applications: [
                        {
                            id: 'app-1',
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                            university: { name: 'Test University' },
                            requirements: [],
                        },
                    ],
                },
            ];

            const mockPreferences = {
                deadlineReminders: false,
                reminderDaysBefore: 7,
            };

            mockPrisma.user.findMany.mockResolvedValue(mockUsers);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.batchCreateNotifications).mockResolvedValue([]);

            const result = await scheduler.processDeadlineReminders();

            expect(notificationService.batchCreateNotifications).toHaveBeenCalledWith([]);
            expect(result).toBe(0);
        });

        it('should not send duplicate notifications', async () => {
            const mockUsers = [
                {
                    id: 'user-1',
                    applications: [
                        {
                            id: 'app-1',
                            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                            university: { name: 'Test University' },
                            requirements: [],
                        },
                    ],
                },
            ];

            const mockPreferences = {
                deadlineReminders: true,
                reminderDaysBefore: 7,
            };

            const existingNotification = {
                id: 'existing-notification',
                message: 'Test University',
            };

            mockPrisma.user.findMany.mockResolvedValue(mockUsers);
            mockPrisma.notification.findFirst.mockResolvedValue(existingNotification);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.batchCreateNotifications).mockResolvedValue([]);

            const result = await scheduler.processDeadlineReminders();

            expect(notificationService.batchCreateNotifications).toHaveBeenCalledWith([]);
            expect(result).toBe(0);
        });
    });

    describe('sendStatusChangeNotification', () => {
        it('should send status change notification to student and parents', async () => {
            const mockApplication = {
                id: 'app-1',
                studentId: 'student-1',
                university: { name: 'Test University' },
                student: { name: 'John Doe' },
            };

            const mockParentLinks = [
                {
                    parentId: 'parent-1',
                    parent: { name: 'Jane Doe' },
                },
            ];

            const mockPreferences = {
                statusUpdates: true,
            };

            mockPrisma.application.findUnique.mockResolvedValue(mockApplication);
            mockPrisma.parentChildLink.findMany.mockResolvedValue(mockParentLinks);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.createNotification).mockResolvedValue({} as any);

            await scheduler.sendStatusChangeNotification('app-1', 'in_progress', 'submitted', 'other-user');

            expect(notificationService.createNotification).toHaveBeenCalledTimes(2); // Student + parent
            expect(notificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-1',
                    type: 'status_update',
                })
            );
            expect(notificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'parent-1',
                    type: 'status_update',
                })
            );
        });

        it('should not send notification if student made the change', async () => {
            const mockApplication = {
                id: 'app-1',
                studentId: 'student-1',
                university: { name: 'Test University' },
                student: { name: 'John Doe' },
            };

            mockPrisma.application.findUnique.mockResolvedValue(mockApplication);

            await scheduler.sendStatusChangeNotification('app-1', 'in_progress', 'submitted', 'student-1');

            expect(notificationService.createNotification).not.toHaveBeenCalled();
        });

        it('should skip users with disabled status updates', async () => {
            const mockApplication = {
                id: 'app-1',
                studentId: 'student-1',
                university: { name: 'Test University' },
                student: { name: 'John Doe' },
            };

            const mockPreferences = {
                statusUpdates: false,
            };

            mockPrisma.application.findUnique.mockResolvedValue(mockApplication);
            mockPrisma.parentChildLink.findMany.mockResolvedValue([]);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);

            await scheduler.sendStatusChangeNotification('app-1', 'in_progress', 'submitted', 'other-user');

            expect(notificationService.createNotification).not.toHaveBeenCalled();
        });
    });

    describe('sendDecisionNotification', () => {
        it('should send decision notification with appropriate emoji and message', async () => {
            const mockApplication = {
                id: 'app-1',
                studentId: 'student-1',
                university: { name: 'Test University' },
                student: { name: 'John Doe' },
            };

            const mockPreferences = {
                decisionAlerts: true,
            };

            mockPrisma.application.findUnique.mockResolvedValue(mockApplication);
            mockPrisma.parentChildLink.findMany.mockResolvedValue([]);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.createNotification).mockResolvedValue({} as any);

            const decisionDate = new Date();
            await scheduler.sendDecisionNotification('app-1', 'accepted', decisionDate);

            expect(notificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'student-1',
                    type: 'decision_received',
                    title: '🎉 Decision Received',
                    message: 'You have been accepted to Test University!',
                })
            );
        });

        it('should handle different decision types correctly', async () => {
            const mockApplication = {
                id: 'app-1',
                studentId: 'student-1',
                university: { name: 'Test University' },
                student: { name: 'John Doe' },
            };

            const mockPreferences = {
                decisionAlerts: true,
            };

            mockPrisma.application.findUnique.mockResolvedValue(mockApplication);
            mockPrisma.parentChildLink.findMany.mockResolvedValue([]);
            vi.mocked(notificationService.getUserPreferences).mockResolvedValue(mockPreferences);
            vi.mocked(notificationService.createNotification).mockResolvedValue({} as any);

            // Test rejected decision
            await scheduler.sendDecisionNotification('app-1', 'rejected', new Date());
            expect(notificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '💔 Decision Received',
                    message: 'You have been rejected to Test University!',
                })
            );

            // Test waitlisted decision
            await scheduler.sendDecisionNotification('app-1', 'waitlisted', new Date());
            expect(notificationService.createNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: '⏳ Decision Received',
                    message: 'You have been waitlisted to Test University!',
                })
            );
        });
    });

    describe('runScheduledTasks', () => {
        it('should run all scheduled tasks and return results', async () => {
            vi.spyOn(scheduler, 'processDeadlineReminders').mockResolvedValue(5);
            vi.spyOn(scheduler, 'processOverdueDeadlines').mockResolvedValue(2);

            const result = await scheduler.runScheduledTasks();

            expect(scheduler.processDeadlineReminders).toHaveBeenCalled();
            expect(scheduler.processOverdueDeadlines).toHaveBeenCalled();
            expect(result).toEqual({
                deadlineReminders: 5,
                overdueNotifications: 2,
            });
        });
    });

    describe('cleanupNotifications', () => {
        it('should cleanup old notifications', async () => {
            vi.mocked(notificationService.cleanupOldNotifications).mockResolvedValue(10);

            const result = await scheduler.cleanupNotifications();

            expect(notificationService.cleanupOldNotifications).toHaveBeenCalled();
            expect(result).toBe(10);
        });
    });
});