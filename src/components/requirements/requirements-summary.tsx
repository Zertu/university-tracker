'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';

interface RequirementsSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  completionPercentage: number;
}

interface RequirementsSummaryProps {
  applicationId: string;
  onSummaryLoad?: (summary: RequirementsSummary) => void;
}

export function RequirementsSummary({ applicationId, onSummaryLoad }: RequirementsSummaryProps) {
  const [summary, setSummary] = useState<RequirementsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [applicationId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}/requirements/summary`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requirements summary');
      }
      
      const data = await response.json();
      setSummary(data);
      onSummaryLoad?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-300 rounded w-full"></div>
            <div className="flex space-x-4">
              <div className="h-8 bg-gray-300 rounded w-16"></div>
              <div className="h-8 bg-gray-300 rounded w-16"></div>
              <div className="h-8 bg-gray-300 rounded w-16"></div>
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
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Requirements Progress
        </h3>
        <span className="text-2xl font-bold text-blue-600">
          {summary.completionPercentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{summary.completed} of {summary.total} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${summary.completionPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="h-6 w-6 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{summary.inProgress}</div>
          <div className="text-sm text-gray-600">In Progress</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="h-6 w-6 rounded-full border-2 border-gray-400"></div>
          </div>
          <div className="text-2xl font-bold text-gray-600">{summary.notStarted}</div>
          <div className="text-sm text-gray-600">Not Started</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
          <div className="text-sm text-gray-600">Overdue</div>
        </div>
      </div>

      {/* Alerts */}
      {summary.overdue > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 font-medium">
              {summary.overdue} requirement{summary.overdue > 1 ? 's' : ''} overdue
            </span>
          </div>
        </div>
      )}

      {summary.completionPercentage === 100 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700 font-medium">
              All requirements completed! Ready for submission.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}