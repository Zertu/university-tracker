'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  badge?: string;
}

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className = '' }: QuickActionsProps) {
  const [profileComplete, setProfileComplete] = useState(false);
  const [urgentDeadlines, setUrgentDeadlines] = useState(0);
  const [pendingRequirements, setPendingRequirements] = useState(0);

  useEffect(() => {
    fetchActionData();
  }, []);

  const fetchActionData = async () => {
    try {
      // Fetch profile completion status
      const profileResponse = await fetch('/api/profile/completion');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfileComplete(profileData.isComplete);
      }

      // Fetch urgent deadlines count
      const deadlinesResponse = await fetch('/api/deadlines/alerts');
      if (deadlinesResponse.ok) {
        const deadlinesData = await deadlinesResponse.json();
        setUrgentDeadlines(deadlinesData.critical + deadlinesData.warning);
      }

      // Fetch pending requirements count
      const requirementsResponse = await fetch('/api/requirements/upcoming');
      if (requirementsResponse.ok) {
        const requirementsData = await requirementsResponse.json();
        setPendingRequirements(requirementsData.length);
      }
    } catch (error) {
      console.error('Error fetching action data:', error);
    }
  };

  const actions: QuickAction[] = [
    {
      title: profileComplete ? 'Update Profile' : 'Complete Your Profile',
      description: profileComplete 
        ? 'Update your academic information and preferences'
        : 'Add your GPA, test scores, and academic preferences',
      href: '/profile',
      priority: profileComplete ? 'low' : 'high',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      badge: profileComplete ? undefined : 'Required'
    },
    {
      title: 'Add New Application',
      description: 'Start tracking a new university application',
      href: '/applications/new',
      priority: 'medium',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    },
    {
      title: 'Search Universities',
      description: 'Find and compare universities for your applications',
      href: '/universities',
      priority: 'medium',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      title: 'Manage Deadlines',
      description: 'View and track all your application deadlines',
      href: '/deadlines',
      priority: urgentDeadlines > 0 ? 'high' : 'medium',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      badge: urgentDeadlines > 0 ? `${urgentDeadlines} urgent` : undefined
    },
    {
      title: 'Track Requirements',
      description: 'Manage application requirements and documents',
      href: '/requirements',
      priority: pendingRequirements > 0 ? 'high' : 'medium',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: pendingRequirements > 0 ? `${pendingRequirements} pending` : undefined
    },
    {
      title: 'Compare Universities',
      description: 'Side-by-side comparison of your target schools',
      href: '/universities/compare',
      priority: 'low',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'border-red-200 hover:border-red-300 hover:bg-red-50';
      case 'medium': return 'border-blue-200 hover:border-blue-300 hover:bg-blue-50';
      case 'low': return 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
      default: return 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
    }
  };

  const getBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIconColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Sort actions by priority
  const sortedActions = [...actions].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} role="region" aria-labelledby="quick-actions-title">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
          <h2 id="quick-actions-title" className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
          <div className="flex items-center space-x-2" role="group" aria-label="Priority legend">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></div>
              <span className="text-xs text-gray-500">High Priority</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true"></div>
              <span className="text-xs text-gray-500">Medium</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Quick action buttons">
          {sortedActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className={`block p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${getPriorityColor(action.priority)}`}
              aria-describedby={`action-${index}-desc`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${getIconColor(action.priority)}`} aria-hidden="true">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {action.title}
                    </h3>
                    {action.badge && (
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getBadgeColor(action.priority)}`} aria-label={`Priority: ${action.badge}`}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p id={`action-${index}-desc`} className="text-sm text-gray-600 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Additional Help Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Need Help?</h3>
              <p className="text-sm text-gray-600">Get guidance on the application process</p>
            </div>
            <Link
              href="/help"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View Guide →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}