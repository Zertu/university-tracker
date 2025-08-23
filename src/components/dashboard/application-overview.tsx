'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  upcomingDeadlines: number;
  completionRate: number;
  averageProgress: number;
}

interface ApplicationOverviewProps {
  className?: string;
}

export function ApplicationOverview({ className = '' }: ApplicationOverviewProps) {
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/applications/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch application stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'not_started': return 'bg-gray-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'submitted': return 'bg-blue-500';
      case 'under_review': return 'bg-purple-500';
      case 'decided': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'not_started': return 'Not Started';
      case 'in_progress': return 'In Progress';
      case 'submitted': return 'Submitted';
      case 'under_review': return 'Under Review';
      case 'decided': return 'Decided';
      default: return status;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'early_decision': return 'Early Decision';
      case 'early_action': return 'Early Action';
      case 'regular': return 'Regular Decision';
      case 'rolling': return 'Rolling Admission';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
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
            onClick={fetchStats}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-labelledby="application-overview-title">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
          <h2 id="application-overview-title" className="text-lg sm:text-xl font-semibold text-gray-900">Application Overview</h2>
          <Link
            href="/applications"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
            aria-label="View all applications"
          >
            View All Applications →
          </Link>
        </div>

        {stats.total === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-500 mb-4">Start tracking your university applications</p>
            <Link
              href="/applications/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Your First Application
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="group" aria-label="Application statistics">
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-blue-600" aria-label={`${stats.total} total applications`}>{stats.total}</div>
                <div className="text-xs sm:text-sm text-gray-600">Total Applications</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-green-600" aria-label={`${stats.completionRate} percent completion rate`}>{stats.completionRate}%</div>
                <div className="text-xs sm:text-sm text-gray-600">Completion Rate</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-orange-600" aria-label={`${stats.upcomingDeadlines} upcoming deadlines`}>{stats.upcomingDeadlines}</div>
                <div className="text-xs sm:text-sm text-gray-600">Upcoming Deadlines</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-purple-600" aria-label={`${stats.averageProgress} percent average progress`}>{stats.averageProgress}%</div>
                <div className="text-xs sm:text-sm text-gray-600">Avg Progress</div>
              </div>
            </div>

            {/* Status Distribution */}
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Application Status</h3>
              <div className="space-y-3" role="group" aria-label="Application status breakdown">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}
                          aria-hidden="true"
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${percentage.toFixed(1)}% of applications are ${getStatusLabel(status).toLowerCase()}`}>
                          <div
                            className={`h-2 rounded-full ${getStatusColor(status)} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-6 sm:w-8 text-right" aria-label={`${count} applications`}>{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Application Type Distribution */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Application Types</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      {getTypeLabel(type)}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 space-y-1 sm:space-y-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Overall Progress</h3>
                <span className="text-sm text-gray-600">{stats.averageProgress}% Complete</span>
              </div>
              <div 
                className="w-full bg-gray-200 rounded-full h-3" 
                role="progressbar" 
                aria-valuenow={stats.averageProgress} 
                aria-valuemin={0} 
                aria-valuemax={100}
                aria-label={`Overall application progress: ${stats.averageProgress}% complete`}
              >
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${stats.averageProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}