'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ApplicationStatus } from '@/lib/validations/application';

interface RecentStatusChange {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedBy: string;
  notes?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  application: {
    id: string;
    university: {
      name: string;
    };
  };
  fromStatusInfo?: {
    label: string;
    color: string;
    description: string;
    icon: string;
  } | null;
  toStatusInfo: {
    label: string;
    color: string;
    description: string;
    icon: string;
  };
}

interface RecentStatusChangesProps {
  limit?: number;
  showApplicationLink?: boolean;
}

export function RecentStatusChanges({ 
  limit = 5, 
  showApplicationLink = true 
}: RecentStatusChangesProps) {
  const [changes, setChanges] = useState<RecentStatusChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentChanges();
  }, [limit]);

  const fetchRecentChanges = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/recent-status-changes?limit=${limit}`);
      
      if (response.ok) {
        const data = await response.json();
        setChanges(data.changes);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch recent changes');
      }
    } catch (err) {
      setError('Failed to fetch recent changes');
      console.error('Error fetching recent changes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const getStatusBadgeClasses = (color: string) => {
    switch (color) {
      case 'gray': return 'bg-gray-100 text-gray-800';
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'green': return 'bg-green-100 text-green-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading recent changes</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button
          onClick={fetchRecentChanges}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No recent status changes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Recent Status Changes</h3>
        {changes.length > 0 && (
          <button
            onClick={fetchRecentChanges}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        )}
      </div>
      
      <div className="space-y-3">
        {changes.map((change) => (
          <div
            key={change.id}
            className="flex items-center space-x-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* Status icon */}
            <div className={`
              h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
              ${getStatusBadgeClasses(change.toStatusInfo.color)}
            `}>
              {change.toStatusInfo.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {showApplicationLink ? (
                    <Link
                      href={`/applications/${change.application.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800 truncate"
                    >
                      {change.application.university.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900 truncate">
                      {change.application.university.name}
                    </span>
                  )}
                </div>
                
                <time className="text-sm text-gray-500 flex-shrink-0">
                  {formatDate(change.createdAt)}
                </time>
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {change.fromStatus ? (
                  <>
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${getStatusBadgeClasses(change.fromStatusInfo?.color || 'gray')}
                    `}>
                      {change.fromStatusInfo?.label}
                    </span>
                    <span className="text-gray-400 text-xs">→</span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">Initial:</span>
                )}
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${getStatusBadgeClasses(change.toStatusInfo.color)}
                `}>
                  {change.toStatusInfo.label}
                </span>
              </div>
              
              {change.notes && (
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {change.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {changes.length >= limit && (
        <div className="text-center">
          <Link
            href="/applications"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all applications →
          </Link>
        </div>
      )}
    </div>
  );
}