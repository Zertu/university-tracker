'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  recentActivity: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export function NotificationDashboard() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotificationStats();
  }, []);

  const fetchNotificationStats = async () => {
    try {
      setLoading(true);
      
      // Fetch various notification statistics
      const [unreadResponse, allResponse] = await Promise.all([
        fetch('/api/notifications/count'),
        fetch('/api/notifications?limit=100'),
      ]);

      if (unreadResponse.ok && allResponse.ok) {
        const unreadData = await unreadResponse.json();
        const allData = await allResponse.json();
        
        const notifications = allData.notifications;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const byType = notifications.reduce((acc: Record<string, number>, notification: any) => {
          acc[notification.type] = (acc[notification.type] || 0) + 1;
          return acc;
        }, {});

        const recentActivity = {
          today: notifications.filter((n: any) => new Date(n.createdAt) >= today).length,
          thisWeek: notifications.filter((n: any) => new Date(n.createdAt) >= thisWeek).length,
          thisMonth: notifications.filter((n: any) => new Date(n.createdAt) >= thisMonth).length,
        };

        setStats({
          total: notifications.length,
          unread: unreadData.unreadCount,
          byType,
          recentActivity,
        });
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return <Clock className="h-4 w-4" />;
      case 'status_update':
        return <TrendingUp className="h-4 w-4" />;
      case 'decision_received':
        return <CheckCircle className="h-4 w-4" />;
      case 'requirement_due':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return 'Deadline Reminders';
      case 'status_update':
        return 'Status Updates';
      case 'decision_received':
        return 'Decision Alerts';
      case 'requirement_due':
        return 'Requirement Due';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return 'text-orange-600 bg-orange-100';
      case 'status_update':
        return 'text-blue-600 bg-blue-100';
      case 'decision_received':
        return 'text-green-600 bg-green-100';
      case 'requirement_due':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          Failed to load notification statistics
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Overview
        </h3>
      </div>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Notifications</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Unread</p>
                <p className="text-2xl font-bold text-orange-900">{stats.unread}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">This Week</p>
                <p className="text-2xl font-bold text-green-900">{stats.recentActivity.thisWeek}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Recent Activity</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity.today}</p>
              <p className="text-sm text-gray-600">Today</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity.thisWeek}</p>
              <p className="text-sm text-gray-600">This Week</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity.thisMonth}</p>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">By Type</h4>
          <div className="space-y-2">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getTypeColor(type)}`}>
                    {getTypeIcon(type)}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {getTypeLabel(type)}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            <button
              onClick={fetchNotificationStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
            >
              Refresh Stats
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium">
              View All Notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}