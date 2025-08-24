'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    graduationYear?: number;
    gpa?: number;
    satScore?: number;
    actScore?: number;
  };
}

interface Application {
  id: string;
  university: {
    name: string;
    country: string;
    tuitionInState?: number;
    tuitionOutState?: number;
    applicationFee?: number;
  };
  applicationType: string;
  deadline: string;
  status: string;
  createdAt: string;
}

interface ParentNote {
  id: string;
  content: string;
  createdAt: string;
  application: {
    id: string;
    university: {
      name: string;
    };
  };
}

export default function ParentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notes, setNotes] = useState<ParentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'financial' | 'notes'>('overview');

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
        
        if (childUsers.length > 0) {
          setSelectedChild(childUsers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildData = useCallback(async () => {
    if (!selectedChild) return;

    try {
      // Fetch applications
      const applicationsResponse = await fetch(`/api/parent/applications/${selectedChild.id}`);
      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        setApplications(applicationsData.applications || []);
      }

      // Fetch notes
      const notesResponse = await fetch(`/api/parent/notes`);
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNotes(notesData.notes || []);
      }
    } catch (error) {
      console.error('Failed to fetch child data:', error);
    }
  }, [selectedChild]);

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
      fetchChildData();
    }
  }, [selectedChild, fetchChildData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'decided': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalCost = () => {
    return applications.reduce((total, app) => {
      const tuition = app.university.tuitionOutState || app.university.tuitionInState || 0;
      const fee = app.university.applicationFee || 0;
      return total + tuition + fee;
    }, 0);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Monitor your child&apos;s application progress and provide support
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push('/parent/profile')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              View Profile
            </button>
            <button
              onClick={() => router.push('/parent/profile/edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Child Selector */}
      {children.length > 0 && (
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
      )}

      {children.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Connected</h3>
          <p className="text-gray-600 mb-4">
            Connect with your child&apos;s account to start monitoring their applications.
          </p>
          <button
            onClick={() => router.push('/relationships')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Child
          </button>
        </div>
      ) : selectedChild ? (
        <>
          {/* Child Info Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedChild.name}</h2>
                <p className="text-gray-600">{selectedChild.email}</p>
                {selectedChild.studentProfile && (
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {selectedChild.studentProfile.graduationYear && (
                      <span>Graduation: {selectedChild.studentProfile.graduationYear}</span>
                    )}
                    {selectedChild.studentProfile.gpa && (
                      <span>GPA: {selectedChild.studentProfile.gpa}</span>
                    )}
                    {selectedChild.studentProfile.satScore && (
                      <span>SAT: {selectedChild.studentProfile.satScore}</span>
                    )}
                    {selectedChild.studentProfile.actScore && (
                      <span>ACT: {selectedChild.studentProfile.actScore}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => router.push(`/parent/profile/${selectedChild.id}`)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  View Profile
                </button>
                <button
                  onClick={() => router.push(`/parent/applications?childId=${selectedChild.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Applications
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview' },
                { id: 'applications', name: 'Applications' },
                { id: 'financial', name: 'Financial Planning' },
                { id: 'notes', name: 'Notes & Communication' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'applications' | 'financial' | 'notes')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white shadow rounded-lg">
            {activeTab === 'overview' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Overview</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                    <div className="text-sm text-blue-600">Total Applications</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {applications.filter(app => app.status === 'submitted').length}
                    </div>
                    <div className="text-sm text-green-600">Submitted</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {applications.filter(app => app.status === 'under_review').length}
                    </div>
                    <div className="text-sm text-yellow-600">Under Review</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {applications.filter(app => app.status === 'decided').length}
                    </div>
                    <div className="text-sm text-purple-600">Decided</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Applications</h4>
                    <div className="space-y-2">
                      {applications.slice(0, 3).map(app => (
                        <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{app.university.name}</div>
                            <div className="text-sm text-gray-600">{app.applicationType}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Notes</h4>
                    <div className="space-y-2">
                      {notes.slice(0, 3).map(note => (
                        <div key={note.id} className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600 mb-1">
                            {note.application.university.name}
                          </div>
                          <div className="text-sm">{note.content.substring(0, 100)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Portfolio</h3>
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
                        <tr key={app.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{app.university.name}</div>
                              <div className="text-sm text-gray-500">{app.university.country}</div>
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
                              onClick={() => router.push(`/parent/applications/${app.id}/notes?childId=${selectedChild.id}`)}
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
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Planning</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ${calculateTotalCost().toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">Total Estimated Cost</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${applications.reduce((total, app) => total + (app.university.applicationFee || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">Application Fees</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${applications.reduce((total, app) => {
                        const tuition = app.university.tuitionOutState || app.university.tuitionInState || 0;
                        return total + tuition;
                      }, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-purple-600">Tuition Costs</div>
                  </div>
                </div>

                <div className="space-y-4">
                  {applications.map(app => (
                    <div key={app.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{app.university.name}</h4>
                          <p className="text-sm text-gray-600">{app.applicationType.replace('_', ' ')}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)} mt-2 sm:mt-0`}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Application Fee:</span>
                          <span className="ml-2 font-medium">
                            ${app.university.applicationFee?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tuition (Out-of-State):</span>
                          <span className="ml-2 font-medium">
                            ${app.university.tuitionOutState?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Tuition (In-State):</span>
                          <span className="ml-2 font-medium">
                            ${app.university.tuitionInState?.toLocaleString() || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Notes & Communication</h3>
                  <button
                    onClick={() => router.push('/parent/notes')}
                    className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Note
                  </button>
                </div>
                <div className="space-y-4">
                  {notes.map(note => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                        <div className="font-medium text-gray-900">
                          {note.application.university.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 sm:mt-0">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No notes yet. Add notes to track important information about applications.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Selected</h3>
          <p className="text-gray-600">
            Please select a child to view their application information.
          </p>
        </div>
      )}
    </div>
  );
}