'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApplicationProgress {
  id: string;
  universityName: string;
  applicationType: string;
  status: string;
  deadline: string;
  progress: number;
  requirementsCompleted: number;
  requirementsTotal: number;
  daysUntilDeadline: number;
  isUrgent: boolean;
}

interface ProgressIndicatorsProps {
  className?: string;
  limit?: number;
}

export function ProgressIndicators({ className = '', limit = 5 }: ProgressIndicatorsProps) {
  const [applications, setApplications] = useState<ApplicationProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicationProgress();
  }, []);

  const fetchApplicationProgress = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/applications/progress?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch application progress');
      }
      
      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'not_started': return 'text-gray-600 bg-gray-100';
      case 'in_progress': return 'text-yellow-700 bg-yellow-100';
      case 'submitted': return 'text-blue-700 bg-blue-100';
      case 'under_review': return 'text-purple-700 bg-purple-100';
      case 'decided': return 'text-green-700 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const getProgressColor = (progress: number, isUrgent: boolean): string => {
    if (isUrgent && progress < 80) {
      return 'from-red-500 to-red-600';
    } else if (progress < 30) {
      return 'from-gray-400 to-gray-500';
    } else if (progress < 70) {
      return 'from-yellow-400 to-yellow-500';
    } else {
      return 'from-green-400 to-green-500';
    }
  };

  const formatDeadline = (deadline: string, daysUntil: number): string => {
    const date = new Date(deadline);
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    if (daysUntil < 0) {
      return `${formatted} (${Math.abs(daysUntil)} days overdue)`;
    } else if (daysUntil === 0) {
      return `${formatted} (Due today)`;
    } else if (daysUntil === 1) {
      return `${formatted} (Due tomorrow)`;
    } else {
      return `${formatted} (${daysUntil} days left)`;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'early_decision': return 'ED';
      case 'early_action': return 'EA';
      case 'regular': return 'RD';
      case 'rolling': return 'Rolling';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
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
            onClick={fetchApplicationProgress}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Application Progress</h2>
          <Link
            href="/applications"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All →
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500">No applications to track yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => (
              <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {app.universityName}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {getTypeLabel(app.applicationType)}
                      </span>
                      {app.isUrgent && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDeadline(app.deadline, app.daysUntilDeadline)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(app.status)}`}>
                    {getStatusLabel(app.status)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm text-gray-600">{app.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full bg-gradient-to-r ${getProgressColor(app.progress, app.isUrgent)} transition-all duration-300`}
                      style={{ width: `${app.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Requirements Progress */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-600">
                        {app.requirementsCompleted}/{app.requirementsTotal} requirements
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/applications/${app.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}

            {applications.length >= limit && (
              <div className="text-center pt-4 border-t border-gray-200">
                <Link
                  href="/applications"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View All Applications
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}