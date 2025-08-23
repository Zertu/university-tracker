'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ApplicationWithRelations } from '@/lib/services/application';
import { ApplicationStatus, ApplicationType } from '@/lib/validations/application';
import { useQuery } from '@/hooks/use-api';
import { LoadingSpinner, SkeletonList } from '@/components/ui/loading';
import { ErrorBoundary } from '@/components/error/error-boundary';

interface ApplicationListProps {
  initialApplications?: ApplicationWithRelations[];
  showFilters?: boolean;
}

export function ApplicationList({ initialApplications = [], showFilters = true }: ApplicationListProps) {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>(initialApplications);
  const [filters, setFilters] = useState({
    status: '',
    applicationType: '',
    search: ''
  });

  const fetchApplications = useCallback(async () => {
    const queryParams = new URLSearchParams();
    
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.applicationType) queryParams.append('applicationType', filters.applicationType);
    
    const response = await fetch(`/api/applications?${queryParams}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch applications');
    }
    
    const data = await response.json();
    return data.applications;
  }, [filters]);

  const { data, loading, error, execute } = useQuery<ApplicationWithRelations[]>({
    showErrorToast: true,
    retries: 2,
  });

  useEffect(() => {
    if (initialApplications.length === 0) {
      execute(fetchApplications).then((fetchedApplications) => {
        if (fetchedApplications) {
          setApplications(fetchedApplications);
        }
      }).catch(() => {
        // Error is handled by useQuery hook
      });
    }
  }, [filters, execute, initialApplications.length, fetchApplications]);

  useEffect(() => {
    if (data) {
      setApplications(data);
    }
  }, [data]);

  const getStatusColor = (status: ApplicationStatus): string => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'decided':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ApplicationStatus): string => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'submitted':
        return 'Submitted';
      case 'under_review':
        return 'Under Review';
      case 'decided':
        return 'Decision Received';
      default:
        return status;
    }
  };

  const getApplicationTypeLabel = (type: ApplicationType): string => {
    switch (type) {
      case 'early_decision':
        return 'Early Decision';
      case 'early_action':
        return 'Early Action';
      case 'regular':
        return 'Regular Decision';
      case 'rolling':
        return 'Rolling Admission';
      default:
        return type;
    }
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDeadline = (deadline: string | Date): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredApplications = applications.filter(app => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return app.university.name.toLowerCase().includes(searchLower) ||
             app.university.city.toLowerCase().includes(searchLower) ||
             app.university.state?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  if (loading && applications.length === 0) {
    return <SkeletonList items={5} />;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Universities
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search by university name or location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="decided">Decision Received</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="applicationType" className="block text-sm font-medium text-gray-700 mb-1">
                Application Type
              </label>
              <select
                id="applicationType"
                value={filters.applicationType}
                onChange={(e) => setFilters(prev => ({ ...prev, applicationType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="early_decision">Early Decision</option>
                <option value="early_action">Early Action</option>
                <option value="regular">Regular Decision</option>
                <option value="rolling">Rolling Admission</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No applications found.</p>
          <Link
            href="/applications/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Your First Application
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((application) => {
            const daysUntilDeadline = getDaysUntilDeadline(application.deadline);
            const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && 
                           (application.status === 'not_started' || application.status === 'in_progress');
            const isCritical = daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && 
                             (application.status === 'not_started' || application.status === 'in_progress');
            const isOverdue = daysUntilDeadline < 0 && 
                            (application.status === 'not_started' || application.status === 'in_progress');
            
            return (
              <Link
                key={application.id}
                href={`/applications/${application.id}`}
                className="block bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {application.university.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {application.university.city}, {application.university.state || application.university.country}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status as ApplicationStatus)}`}>
                      {getStatusLabel(application.status as ApplicationStatus)}
                    </span>
                    
                    {isOverdue && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Overdue: {Math.abs(daysUntilDeadline)} days
                      </span>
                    )}
                    {isCritical && !isOverdue && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Critical: {daysUntilDeadline} days left
                      </span>
                    )}
                    {isUrgent && !isCritical && !isOverdue && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Due soon: {daysUntilDeadline} days left
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Type:</span>
                    <p className="text-gray-600">{getApplicationTypeLabel(application.applicationType as ApplicationType)}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Deadline:</span>
                    <p className="text-gray-600">{formatDate(application.deadline)}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Requirements:</span>
                    <p className="text-gray-600">
                      {application.requirements?.filter(req => req.status === 'completed').length || 0} / {application.requirements?.length || 0} completed
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Decision:</span>
                    <p className="text-gray-600">
                      {application.decisionType ? (
                        <span className={`capitalize ${
                          application.decisionType === 'accepted' ? 'text-green-600' :
                          application.decisionType === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {application.decisionType}
                        </span>
                      ) : (
                        'Pending'
                      )}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}