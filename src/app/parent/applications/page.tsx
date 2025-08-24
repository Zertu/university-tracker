'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Application {
  id: string;
  university: {
    name: string;
    country: string;
    city: string;
    state?: string;
  };
  applicationType: string;
  deadline: string;
  status: string;
  createdAt: string;
}

interface Child {
  id: string;
  name: string;
  email: string;
}

function ParentApplicationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('childId');
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'parent') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchChildren();
    }
  }, [status, session, router]);

  useEffect(() => {
    if (selectedChild) {
      fetchApplications();
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/relationships');
      if (response.ok) {
        const data = await response.json();
        const childUsers = data.relationships
          .filter((rel: { child: Child }) => rel.child)
          .map((rel: { child: Child }) => rel.child);
        setChildren(childUsers);
        
        if (childId) {
          const foundChild = childUsers.find((child: Child) => child.id === childId);
          if (foundChild) {
            setSelectedChild(foundChild);
          } else if (childUsers.length > 0) {
            setSelectedChild(childUsers[0]);
          }
        } else if (childUsers.length > 0) {
          setSelectedChild(childUsers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      setError('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!selectedChild) return;

    try {
      const response = await fetch(`/api/parent/applications/${selectedChild.id}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      setError('Failed to load applications');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'decided': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.user.role !== 'parent') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Applications</h1>
            <p className="mt-2 text-gray-600">
              View your child&apos;s university applications
            </p>
          </div>
          <button
            onClick={() => router.push('/parent-dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Connected</h3>
          <p className="text-gray-600 mb-4">
            Connect with your child&apos;s account to view their applications.
          </p>
          <button
            onClick={() => router.push('/relationships')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Child
          </button>
        </div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="mb-6">
            <label htmlFor="child-selector" className="block text-sm font-medium text-gray-700 mb-2">
              Select Child
            </label>
            <select
              id="child-selector"
              value={selectedChild?.id || ''}
              onChange={(e) => {
                const child = children.find(c => c.id === e.target.value);
                setSelectedChild(child || null);
              }}
              className="block w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Applications Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedChild?.name}&apos;s Applications
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {applications.length} application{applications.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      University
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deadline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{app.university.name}</div>
                          <div className="text-sm text-gray-500">
                            {app.university.city}{app.university.state ? `, ${app.university.state}` : ''}, {app.university.country}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {app.applicationType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(app.deadline).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => router.push(`/parent/applications/${app.id}/notes?childId=${selectedChild?.id}`)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Add Note
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {applications.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-3">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">No Applications Yet</h4>
                <p className="text-sm text-gray-500">
                  {selectedChild?.name} hasn&apos;t added any applications yet.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ParentApplicationsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <ParentApplicationsContent />
    </Suspense>
  );
}