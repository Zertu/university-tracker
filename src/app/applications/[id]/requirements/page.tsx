'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { RequirementsChecklist } from '@/components/requirements/requirements-checklist';
import { RequirementsSummary } from '@/components/requirements/requirements-summary';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';

interface Application {
  id: string;
  university: {
    name: string;
  };
  applicationType: string;
  deadline: string;
}

export default function ApplicationRequirementsPage() {
  const params = useParams();
  const applicationId = params.id as string;
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch application');
      }
      
      const data = await response.json();
      setApplication(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRequirementUpdate = () => {
    // Refresh the page data when requirements are updated
    fetchApplication();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="h-96 bg-gray-300 rounded-lg"></div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-64 bg-gray-300 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Application</h3>
                <p className="text-red-600 mt-1">{error || 'Application not found'}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/applications"
                className="inline-flex items-center text-red-600 hover:text-red-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Applications
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/applications/${applicationId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Application
          </Link>
          
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 mr-3" />
                  Application Requirements
                </h1>
                <p className="text-gray-600 mt-1">
                  {application.university.name} • {application.applicationType.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Application Deadline</div>
                <div className="font-medium text-gray-900">
                  {new Date(application.deadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requirements Checklist */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border p-6">
              <RequirementsChecklist
                applicationId={applicationId}
                onRequirementUpdate={handleRequirementUpdate}
              />
            </div>
          </div>

          {/* Requirements Summary */}
          <div className="lg:col-span-1">
            <RequirementsSummary applicationId={applicationId} />
          </div>
        </div>
      </div>
    </div>
  );
}