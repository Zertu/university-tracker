'use client';

import { useState, useEffect } from 'react';
import { RequirementWithProgress } from '@/lib/services/requirements';
import { TrendingUp, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface RequirementProgressData {
  totalRequirements: number;
  completedRequirements: number;
  progressPercentage: number;
  nextDeadline: Date | null;
  criticalRequirements: RequirementWithProgress[];
  recentlyCompleted: RequirementWithProgress[];
}

interface RequirementProgressProps {
  applicationId: string;
}

export function RequirementProgress({ applicationId }: RequirementProgressProps) {
  const [progress, setProgress] = useState<RequirementProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [applicationId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}/requirements/progress`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requirement progress');
      }
      
      const data = await response.json();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-600';
    if (percentage >= 60) return 'bg-blue-600';
    if (percentage >= 40) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-300 rounded w-full"></div>
            <div className="flex space-x-4">
              <div className="h-16 bg-gray-300 rounded w-1/3"></div>
              <div className="h-16 bg-gray-300 rounded w-1/3"></div>
              <div className="h-16 bg-gray-300 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Progress Tracking
        </h3>
        <span className={`text-2xl font-bold ${getProgressColor(progress.progressPercentage)}`}>
          {progress.progressPercentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Overall Progress</span>
          <span>{progress.completedRequirements} of {progress.totalRequirements} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${getProgressBgColor(progress.progressPercentage)}`}
            style={{ width: `${progress.progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{progress.completedRequirements}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {progress.totalRequirements - progress.completedRequirements}
          </div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{progress.criticalRequirements.length}</div>
          <div className="text-sm text-gray-600">Critical</div>
        </div>
      </div>

      {/* Next Deadline */}
      {progress.nextDeadline && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <div className="font-medium text-blue-800">Next Deadline</div>
              <div className="text-blue-600">
                {new Date(progress.nextDeadline).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Requirements */}
      {progress.criticalRequirements.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
            Critical Requirements
          </h4>
          <div className="space-y-2">
            {progress.criticalRequirements.slice(0, 3).map((requirement) => (
              <div key={requirement.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                <span className="text-sm font-medium text-red-800 truncate">
                  {requirement.title}
                </span>
                <span className="text-xs text-red-600 ml-2">
                  {requirement.isOverdue 
                    ? `Overdue by ${Math.abs(requirement.daysUntilDeadline || 0)} days`
                    : requirement.daysUntilDeadline === 0 
                      ? 'Due today'
                      : `Due in ${requirement.daysUntilDeadline} days`
                  }
                </span>
              </div>
            ))}
            {progress.criticalRequirements.length > 3 && (
              <div className="text-center">
                <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                  View {progress.criticalRequirements.length - 3} more critical requirements
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recently Completed */}
      {progress.recentlyCompleted.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            Recently Completed
          </h4>
          <div className="space-y-2">
            {progress.recentlyCompleted.slice(0, 3).map((requirement) => (
              <div key={requirement.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                <span className="text-sm font-medium text-green-800 truncate">
                  {requirement.title}
                </span>
                <span className="text-xs text-green-600 ml-2">
                  Completed {new Date(requirement.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {progress.recentlyCompleted.length > 3 && (
              <div className="text-center">
                <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                  View {progress.recentlyCompleted.length - 3} more completed requirements
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}