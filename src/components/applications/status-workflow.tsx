'use client';

import { useState } from 'react';
import { ApplicationStatus } from '@/lib/validations/application';

interface StatusInfo {
  label: string;
  color: string;
  description: string;
  icon: string;
}

interface StatusWorkflowProps {
  currentStatus: ApplicationStatus;
  applicationId: string;
  onStatusChange?: (newStatus: ApplicationStatus) => void;
  readOnly?: boolean;
}

const statusOrder: ApplicationStatus[] = [
  'not_started',
  'in_progress', 
  'submitted',
  'under_review',
  'decided'
];

const statusInfo: Record<ApplicationStatus, StatusInfo> = {
  'not_started': {
    label: 'Not Started',
    color: 'gray',
    description: 'Application has been created but work has not begun',
    icon: '○'
  },
  'in_progress': {
    label: 'In Progress',
    color: 'blue',
    description: 'Currently working on application requirements',
    icon: '◐'
  },
  'submitted': {
    label: 'Submitted',
    color: 'green',
    description: 'Application has been submitted to the university',
    icon: '✓'
  },
  'under_review': {
    label: 'Under Review',
    color: 'yellow',
    description: 'University is reviewing the application',
    icon: '👁'
  },
  'decided': {
    label: 'Decision Received',
    color: 'purple',
    description: 'University has made a decision on the application',
    icon: '🏁'
  }
};

const getStatusColorClasses = (color: string, isActive: boolean, isCompleted: boolean) => {
  const baseClasses = 'transition-colors duration-200';
  
  if (isCompleted) {
    return `${baseClasses} bg-green-100 text-green-800 border-green-300`;
  }
  
  if (isActive) {
    switch (color) {
      case 'gray': return `${baseClasses} bg-gray-100 text-gray-800 border-gray-300`;
      case 'blue': return `${baseClasses} bg-blue-100 text-blue-800 border-blue-300`;
      case 'green': return `${baseClasses} bg-green-100 text-green-800 border-green-300`;
      case 'yellow': return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`;
      case 'purple': return `${baseClasses} bg-purple-100 text-purple-800 border-purple-300`;
      default: return `${baseClasses} bg-gray-100 text-gray-800 border-gray-300`;
    }
  }
  
  return `${baseClasses} bg-gray-50 text-gray-400 border-gray-200`;
};

export function StatusWorkflow({ 
  currentStatus, 
  applicationId, 
  onStatusChange,
  readOnly = false 
}: StatusWorkflowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [nextPossibleStatuses, setNextPossibleStatuses] = useState<ApplicationStatus[]>([]);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  const currentIndex = statusOrder.indexOf(currentStatus);

  const fetchNextStatuses = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`);
      if (response.ok) {
        const data = await response.json();
        setNextPossibleStatuses(data.nextPossibleStatuses.map((s: any) => s.status));
      }
    } catch (error) {
      console.error('Error fetching next statuses:', error);
    }
  };

  const handleStatusClick = async (status: ApplicationStatus) => {
    if (readOnly || status === currentStatus) return;
    
    await fetchNextStatuses();
    if (nextPossibleStatuses.includes(status)) {
      setShowTransitionModal(true);
    }
  };

  const updateStatus = async (newStatus: ApplicationStatus, notes?: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, notes }),
      });

      if (response.ok) {
        onStatusChange?.(newStatus);
        setShowTransitionModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full">
      {/* Status Progress Bar */}
      <div className="flex items-center justify-between mb-4">
        {statusOrder.map((status, index) => {
          const info = statusInfo[status];
          const isActive = status === currentStatus;
          const isCompleted = index < currentIndex;
          const isClickable = !readOnly && (
            status === currentStatus || 
            nextPossibleStatuses.includes(status)
          );

          return (
            <div key={status} className="flex flex-col items-center flex-1">
              {/* Status Circle */}
              <button
                onClick={() => handleStatusClick(status)}
                disabled={!isClickable}
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium
                  ${getStatusColorClasses(info.color, isActive, isCompleted)}
                  ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  ${isUpdating ? 'opacity-50' : ''}
                `}
              >
                {info.icon}
              </button>
              
              {/* Status Label */}
              <span className={`
                mt-2 text-xs font-medium text-center
                ${isActive ? 'text-gray-900' : 'text-gray-500'}
              `}>
                {info.label}
              </span>
              
              {/* Connection Line */}
              {index < statusOrder.length - 1 && (
                <div className={`
                  absolute top-5 left-1/2 w-full h-0.5 -z-10
                  ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}
                `} style={{ 
                  transform: 'translateX(50%)',
                  width: 'calc(100% - 2.5rem)'
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Status Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">
              Current Status: {statusInfo[currentStatus].label}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {statusInfo[currentStatus].description}
            </p>
          </div>
          
          {!readOnly && (
            <button
              onClick={() => fetchNextStatuses().then(() => setShowTransitionModal(true))}
              disabled={isUpdating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </button>
          )}
        </div>
      </div>

      {/* Status Transition Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Update Application Status</h3>
            
            <div className="space-y-3 mb-4">
              {nextPossibleStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={isUpdating}
                  className={`
                    w-full p-3 text-left rounded-lg border-2 transition-colors
                    ${getStatusColorClasses(statusInfo[status].color, false, false)}
                    hover:border-blue-300 disabled:opacity-50
                  `}
                >
                  <div className="flex items-center">
                    <span className="mr-3">{statusInfo[status].icon}</span>
                    <div>
                      <div className="font-medium">{statusInfo[status].label}</div>
                      <div className="text-sm opacity-75">{statusInfo[status].description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTransitionModal(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}