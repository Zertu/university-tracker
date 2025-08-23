'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import Link from 'next/link';
import { DeadlineAlert } from '@/lib/services/deadline';

interface DeadlineAlertsProps {
  daysAhead?: number;
  includeRequirements?: boolean;
  showTitle?: boolean;
  maxItems?: number;
}

export function DeadlineAlerts({ 
  daysAhead = 30, 
  includeRequirements = true,
  showTitle = true,
  maxItems 
}: DeadlineAlertsProps) {
  const [alerts, setAlerts] = useState<DeadlineAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        daysAhead: daysAhead.toString(),
        includeRequirements: includeRequirements.toString()
      });

      const response = await fetch(`/api/deadlines/alerts?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch deadline alerts');
      }
      
      const data = await response.json();
      setAlerts(maxItems ? data.alerts.slice(0, maxItems) : data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [daysAhead, includeRequirements, maxItems]);

  useEffect(() => {
    fetchAlerts();
  }, [daysAhead, includeRequirements, fetchAlerts]);

  const getUrgencyColor = (urgencyLevel: string): string => {
    switch (urgencyLevel) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getUrgencyIcon = (urgencyLevel: string): JSX.Element => {
    switch (urgencyLevel) {
      case 'critical':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysText = (daysUntil: number): string => {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days overdue`;
    } else if (daysUntil === 0) {
      return 'Due today';
    } else if (daysUntil === 1) {
      return 'Due tomorrow';
    } else {
      return `${daysUntil} days left`;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
        )}
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchAlerts}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-6">
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
        )}
        <p className="text-gray-500">No upcoming deadlines in the next {daysAhead} days.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          <Link
            href="/deadlines"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </Link>
        </div>
      )}
      
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Link
            key={alert.id}
            href={`/applications/${alert.applicationId}`}
            className={`block p-4 rounded-lg border transition-colors hover:shadow-md ${getUrgencyColor(alert.urgencyLevel)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getUrgencyIcon(alert.urgencyLevel)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {alert.universityName}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {alert.applicationType.replace('_', ' ')} Application
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(alert.deadline)}
                </p>
                <p className={`text-xs font-medium ${
                  alert.daysUntil <= 0 ? 'text-red-600' :
                  alert.daysUntil <= 3 ? 'text-red-600' :
                  alert.daysUntil <= 7 ? 'text-yellow-600' :
                  'text-gray-600'
                }`}>
                  {getDaysText(alert.daysUntil)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}