'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Application {
  id: string;
  status: string;
  deadline: string;
  decisionType?: string;
  progress: number;
  totalRequirements: number;
  completedRequirements: number;
  university: {
    id: string;
    name: string;
    country: string;
    state?: string;
    city: string;
    tuitionInState?: number;
    tuitionOutState?: number;
    applicationFee?: number;
  };
  parentNotes: Array<{
    id: string;
    note: string;
    createdAt: string;
  }>;
}

interface ParentApplicationOverviewProps {
  childId: string;
  maxApplications?: number;
  showViewAllButton?: boolean;
}

export default function ParentApplicationOverview({ 
  childId, 
  maxApplications = 5, 
  showViewAllButton = true 
}: ParentApplicationOverviewProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [childId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/parent/applications/${childId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'decided': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDecisionColor = (decisionType?: string) => {
    switch (decisionType) {
      case 'accepted': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'waitlisted': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDecision = (decisionType?: string) => {
    if (!decisionType) return null;
    return decisionType.charAt(0).toUpperCase() + decisionType.slice(1);
  };

  const handleViewAllApplications = () => {
    router.push(`/parent/applications?childId=${childId}`);
  };

  const handleViewApplication = (applicationId: string) => {
    router.push(`/parent/applications/${applicationId}?childId=${childId}`);
  };

  const handleAddNote = (applicationId: string) => {
    router.push(`/parent/applications/${applicationId}/notes?childId=${childId}`);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchApplications}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayApplications = applications.slice(0, maxApplications);
  const hasMoreApplications = applications.length > maxApplications;

  // Calculate statistics
  const totalApplications = applications.length;
  const submittedApplications = applications.filter(app => 
    app.status === 'submitted' || app.status === 'under_review' || app.status === 'decided'
  ).length;
  const acceptedApplications = applications.filter(app => app.decisionType === 'accepted').length;
  const averageProgress = applications.length > 0 
    ? Math.round(applications.reduce((sum, app) => sum + app.progress, 0) / applications.length)
    : 0;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Application Overview</h3>
            <p className="text-sm text-gray-600 mt-1">
              {totalApplications} application{totalApplications !== 1 ? 's' : ''} total
            </p>
          </div>
          {showViewAllButton && (
            <button
              onClick={handleViewAllApplications}
              className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View All
            </button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalApplications}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{submittedApplications}</div>
            <div className="text-xs text-gray-600">Submitted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{acceptedApplications}</div>
            <div className="text-xs text-gray-600">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{averageProgress}%</div>
            <div className="text-xs text-gray-600">Avg Progress</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {displayApplications.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No Applications Yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Applications will appear here once they are created.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayApplications.map((application) => {
              const deadline = new Date(application.deadline);
              const isUrgent = deadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
              const tuition = application.university.tuitionOutState || application.university.tuitionInState;

              return (
                <div key={application.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{application.university.name}</h4>
                      <p className="text-xs text-gray-500">
                        {application.university.city}, {application.university.state || application.university.country}
                      </p>
                    </div>
                    <div className="flex flex-col items-end mt-2 sm:mt-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                        {formatStatus(application.status)}
                      </span>
                      {application.decisionType && (
                        <span className={`text-xs font-medium mt-1 ${getDecisionColor(application.decisionType)}`}>
                          {formatDecision(application.decisionType)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 text-xs">
                    <div>
                      <span className="text-gray-600">Deadline:</span>
                      <span className={`ml-1 font-medium ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                        {deadline.toLocaleDateString()}
                        {isUrgent && <span className="ml-1">(Urgent)</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Progress:</span>
                      <span className="ml-1 font-medium text-gray-900">{application.progress}%</span>
                    </div>
                    {tuition && (
                      <div>
                        <span className="text-gray-600">Tuition:</span>
                        <span className="ml-1 font-medium text-gray-900">
                          ${tuition.toLocaleString()}/year
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {application.parentNotes.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {application.parentNotes.length} note{application.parentNotes.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAddNote(application.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Add Note
                      </button>
                      <button
                        onClick={() => handleViewApplication(application.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>

                  {application.parentNotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Latest note:</p>
                      <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded">
                        {application.parentNotes[0].note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMoreApplications && (
              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleViewAllApplications}
                  className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View All {applications.length} Applications →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}