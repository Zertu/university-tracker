'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'deadline' | 'requirement' | 'application';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate: string;
  daysUntil: number;
  applicationId?: string;
  requirementId?: string;
  universityName?: string;
  status: 'pending' | 'in_progress' | 'completed';
  isOverdue: boolean;
}

interface TaskManagementProps {
  className?: string;
  showCompleted?: boolean;
  limit?: number;
}

export function TaskManagement({ 
  className = '', 
  showCompleted = false, 
  limit = 10 
}: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');

  useEffect(() => {
    fetchTasks();
  }, [showCompleted, limit]);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        showCompleted: showCompleted.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/tasks?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const markTaskCompleted = async (taskId: string, type: string) => {
    try {
      let endpoint = '';
      if (type === 'requirement') {
        endpoint = `/api/applications/requirements/${taskId}`;
      } else if (type === 'application') {
        endpoint = `/api/applications/${taskId}/status`;
      }

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: type === 'requirement' ? 'completed' : 'submitted' 
          }),
        });

        if (response.ok) {
          await fetchTasks(); // Refresh tasks
        }
      }
    } catch (error) {
      console.error('Error marking task as completed:', error);
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string): React.ReactNode => {
    switch (priority) {
      case 'critical':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'high':
        return (
          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'deadline':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'requirement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'application':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDueDate = (dueDate: string, daysUntil: number, isOverdue: boolean): string => {
    const date = new Date(dueDate);
    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    if (isOverdue) {
      return `${formatted} (${Math.abs(daysUntil)} days overdue)`;
    } else if (daysUntil === 0) {
      return `${formatted} (Due today)`;
    } else if (daysUntil === 1) {
      return `${formatted} (Due tomorrow)`;
    } else {
      return `${formatted} (${daysUntil} days left)`;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return task.isOverdue;
    return task.priority === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - 
             priorityOrder[b.priority as keyof typeof priorityOrder];
    } else {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
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
            onClick={fetchTasks}
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
          <h2 className="text-xl font-semibold text-gray-900">Upcoming Tasks</h2>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Tasks</option>
              <option value="critical">Critical</option>
              <option value="high">High Priority</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="dueDate">Sort by Date</option>
              <option value="priority">Sort by Priority</option>
            </select>
          </div>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500">No tasks found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  task.isOverdue ? 'border-red-300 bg-red-50' : 
                  task.priority === 'critical' ? 'border-red-200 bg-red-50' :
                  task.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                  'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <button
                      onClick={() => markTaskCompleted(task.id, task.type)}
                      className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center ${
                        task.status === 'completed' 
                          ? 'bg-green-500 border-green-500' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {task.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(task.type)}
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {task.title}
                          </h3>
                        </div>
                        {getPriorityIcon(task.priority)}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {task.universityName && (
                            <span className="text-xs text-gray-500">
                              {task.universityName}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-xs font-medium ${
                            task.isOverdue ? 'text-red-600' :
                            task.daysUntil <= 1 ? 'text-red-600' :
                            task.daysUntil <= 3 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}>
                            {formatDueDate(task.dueDate, task.daysUntil, task.isOverdue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {task.applicationId && (
                      <Link
                        href={`/applications/${task.applicationId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sortedTasks.length >= limit && (
              <div className="text-center pt-4 border-t border-gray-200">
                <Link
                  href="/tasks"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  View All Tasks
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