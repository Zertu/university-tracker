'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DeadlineSummary {
  critical: number;
  warning: number;
  total: number;
  nextDeadline?: {
    title: string;
    date: Date;
    daysUntil: number;
  };
}

interface DeadlineSummaryProps {
  showNextDeadline?: boolean;
  className?: string;
}

export function DeadlineSummaryWidget({ 
  showNextDeadline = true,
  className = ''
}: DeadlineSummaryProps) {
  const [summary, setSummary] = useState<DeadlineSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/deadlines/summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch deadline summary');
      }
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
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
      return `in ${daysUntil} days`;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchSummary}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Deadline Overview</h3>
          <Link
            href="/deadlines"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all
          </Link>
        </div>

        {summary.total === 0 ? (
          <div className="text-center py-4">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
                <div className="text-xs text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.warning}</div>
                <div className="text-xs text-gray-500">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>

            {/* Next Deadline */}
            {showNextDeadline && summary.nextDeadline && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Next Deadline</p>
                    <p className="text-sm text-gray-600 truncate">
                      {summary.nextDeadline.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(summary.nextDeadline.date)}
                    </p>
                    <p className={`text-xs font-medium ${
                      summary.nextDeadline.daysUntil <= 0 ? 'text-red-600' :
                      summary.nextDeadline.daysUntil <= 3 ? 'text-red-600' :
                      summary.nextDeadline.daysUntil <= 7 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {getDaysText(summary.nextDeadline.daysUntil)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Indicators */}
            {(summary.critical > 0 || summary.warning > 0) && (
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2">
                  {summary.critical > 0 && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-xs font-medium">Urgent attention needed</span>
                    </div>
                  )}
                  {summary.warning > 0 && summary.critical === 0 && (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium">Action required soon</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}