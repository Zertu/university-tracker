'use client';

import { useState, useEffect } from 'react';
import { RequirementWithProgress } from '@/lib/services/requirements';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface UpcomingRequirementsProps {
  daysAhead?: number;
  maxItems?: number;
}

export function UpcomingRequirements({ daysAhead = 7, maxItems = 5 }: UpcomingRequirementsProps) {
  const [requirements, setRequirements] = useState<RequirementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingRequirements();
  }, [daysAhead]);

  const fetchUpcomingRequirements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/requirements/upcoming?days=${daysAhead}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch upcoming requirements');
      }
      
      const data = await response.json();
      setRequirements(data.slice(0, maxItems));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (daysUntilDeadline: number | null) => {
    if (daysUntilDeadline === null) return 'text-gray-500';
    if (daysUntilDeadline === 0) return 'text-red-600';
    if (daysUntilDeadline === 1) return 'text-orange-600';
    if (daysUntilDeadline <= 3) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getUrgencyBg = (daysUntilDeadline: number | null) => {
    if (daysUntilDeadline === null) return 'bg-gray-50 border-gray-200';
    if (daysUntilDeadline === 0) return 'bg-red-50 border-red-200';
    if (daysUntilDeadline === 1) return 'bg-orange-50 border-orange-200';
    if (daysUntilDeadline <= 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-blue-50 border-blue-200';
  };

  const formatDeadlineText = (daysUntilDeadline: number | null) => {
    if (daysUntilDeadline === null) return 'No deadline';
    if (daysUntilDeadline === 0) return 'Due today';
    if (daysUntilDeadline === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDeadline} days`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
              <div className="h-4 w-4 bg-gray-300 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
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

  if (requirements.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm">No upcoming requirements in the next {daysAhead} days</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Upcoming Requirements
        </h3>
        <span className="text-sm text-gray-500">Next {daysAhead} days</span>
      </div>

      <div className="space-y-2">
        {requirements.map((requirement) => (
          <div
            key={requirement.id}
            className={`p-3 rounded-lg border transition-colors ${getUrgencyBg(
              requirement.daysUntilDeadline
            )}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">
                  {requirement.title}
                </h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500 capitalize">
                    {requirement.requirementType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className={`text-xs font-medium ${getUrgencyColor(
                    requirement.daysUntilDeadline
                  )}`}>
                    {formatDeadlineText(requirement.daysUntilDeadline)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {requirement.daysUntilDeadline !== null && requirement.daysUntilDeadline <= 1 && (
                  <AlertTriangle className={`h-4 w-4 ${getUrgencyColor(
                    requirement.daysUntilDeadline
                  )}`} />
                )}
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {requirement.deadline && (
              <div className="mt-2 text-xs text-gray-600">
                Deadline: {requirement.deadline.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {requirements.length === maxItems && (
        <div className="text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all upcoming requirements
          </button>
        </div>
      )}
    </div>
  );
}