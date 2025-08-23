'use client';

import { useState, useEffect } from 'react';
import { ApplicationStatus } from '@/lib/validations/application';

interface StatusHistoryEntry {
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

interface StatusHistoryProps {
  applicationId: string;
}

export function StatusHistory({ applicationId }: StatusHistoryProps) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatusHistory();
  }, [applicationId]);

  const fetchStatusHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}/status-history`);
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch status history');
      }
    } catch (err) {
      setError('Failed to fetch status history');
      console.error('Error fetching status history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
      <div className="animate-pulse">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Error loading status history</div>
        <div className="text-sm text-gray-500">{error}</div>
        <button
          onClick={fetchStatusHistory}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No status changes recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Status History</h3>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {history.map((entry, index) => (
            <li key={entry.id}>
              <div className="relative pb-8">
                {/* Connection line */}
                {index !== history.length - 1 && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                
                <div className="relative flex space-x-3">
                  {/* Status icon */}
                  <div className={`
                    h-8 w-8 rounded-full flex items-center justify-center text-sm
                    ${getStatusBadgeClasses(entry.toStatusInfo.color)}
                  `}>
                    {entry.toStatusInfo.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {entry.fromStatus ? (
                          <>
                            <span className={`
                              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${getStatusBadgeClasses(entry.fromStatusInfo?.color || 'gray')}
                            `}>
                              {entry.fromStatusInfo?.label}
                            </span>
                            <span className="text-gray-400">→</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Initial status:</span>
                        )}
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${getStatusBadgeClasses(entry.toStatusInfo.color)}
                        `}>
                          {entry.toStatusInfo.label}
                        </span>
                      </div>
                      
                      <time className="text-sm text-gray-500">
                        {formatDate(entry.createdAt)}
                      </time>
                    </div>
                    
                    <div className="mt-1">
                      <p className="text-sm text-gray-600">
                        Changed by <span className="font-medium">{entry.user.name}</span>
                      </p>
                      
                      {entry.notes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">{entry.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}