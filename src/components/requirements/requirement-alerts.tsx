'use client';

import { useState, useEffect } from 'react';
import { RequirementWithProgress } from '@/lib/services/requirements';
import { AlertTriangle, Clock, Bell, CheckCircle, X } from 'lucide-react';

interface RequirementAlerts {
  critical: RequirementWithProgress[];
  warning: RequirementWithProgress[];
  upcoming: RequirementWithProgress[];
}

interface RequirementAlertsProps {
  showAll?: boolean;
  maxItems?: number;
}

export function RequirementAlerts({ showAll = false, maxItems = 5 }: RequirementAlertsProps) {
  const [alerts, setAlerts] = useState<RequirementAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requirements/alerts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch requirement alerts');
      }
      
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (requirementId: string) => {
    setDismissed(prev => new Set(prev).add(requirementId));
  };

  const getAlertIcon = (type: 'critical' | 'warning' | 'upcoming') => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'upcoming':
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertColor = (type: 'critical' | 'warning' | 'upcoming') => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'upcoming':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const formatDeadlineText = (requirement: RequirementWithProgress) => {
    if (requirement.isOverdue) {
      return `Overdue by ${Math.abs(requirement.daysUntilDeadline || 0)} days`;
    } else if (requirement.daysUntilDeadline === 0) {
      return 'Due today';
    } else if (requirement.daysUntilDeadline === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${requirement.daysUntilDeadline} days`;
    }
  };

  const renderAlertGroup = (
    requirements: RequirementWithProgress[],
    type: 'critical' | 'warning' | 'upcoming',
    title: string
  ) => {
    const visibleRequirements = requirements
      .filter(req => !dismissed.has(req.id))
      .slice(0, showAll ? undefined : maxItems);

    if (visibleRequirements.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center mb-2">
          {getAlertIcon(type)}
          <h4 className="ml-2 font-medium text-gray-900">{title}</h4>
          <span className="ml-2 text-sm text-gray-500">
            ({visibleRequirements.length})
          </span>
        </div>
        
        <div className="space-y-2">
          {visibleRequirements.map((requirement) => (
            <div
              key={requirement.id}
              className={`p-3 rounded-lg border ${getAlertColor(type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h5 className="font-medium truncate">{requirement.title}</h5>
                    <span className="text-xs px-2 py-1 bg-white rounded-full">
                      {requirement.requirementType.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="mt-1 text-sm">
                    {formatDeadlineText(requirement)}
                  </div>
                  
                  {requirement.deadline && (
                    <div className="mt-1 text-xs opacity-75">
                      Deadline: {requirement.deadline.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => dismissAlert(requirement.id)}
                  className="ml-2 p-1 hover:bg-white rounded-full transition-colors"
                  title="Dismiss alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {!showAll && requirements.length > maxItems && (
          <div className="mt-2 text-center">
            <button className="text-sm text-gray-600 hover:text-gray-800">
              View {requirements.length - maxItems} more {type} alerts
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
              <div className="h-5 w-5 bg-gray-300 rounded"></div>
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

  if (!alerts) {
    return null;
  }

  const totalAlerts = alerts.critical.length + alerts.warning.length + alerts.upcoming.length;

  if (totalAlerts === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p className="text-sm">No upcoming requirement deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          Requirement Alerts
        </h3>
        <span className="text-sm text-gray-500">{totalAlerts} alerts</span>
      </div>

      {renderAlertGroup(alerts.critical, 'critical', 'Critical - Overdue or Due Today')}
      {renderAlertGroup(alerts.warning, 'warning', 'Warning - Due Within 3 Days')}
      {renderAlertGroup(alerts.upcoming, 'upcoming', 'Upcoming - Due Within 7 Days')}
    </div>
  );
}