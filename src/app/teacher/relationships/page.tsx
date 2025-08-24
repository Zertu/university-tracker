'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ConnectedStudent {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    graduationYear?: number;
    gpa?: number;
    satScore?: number;
    actScore?: number;
  };
  applications: Array<{
    id: string;
    status: string;
    university: {
      name: string;
    };
  }>;
}

export default function TeacherRelationshipsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<ConnectedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'teacher') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchRelationships();
    }
  }, [status, session, router]);

  const fetchRelationships = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/relationships');
      if (response.ok) {
        const data = await response.json();
        const studentData = data.relationships.map((item: any) => item.student);
        setStudents(studentData);
      } else {
        setError('Failed to load relationships');
      }
    } catch (error) {
      console.error('Error fetching relationships:', error);
      setError('Failed to load relationships');
    } finally {
      setLoading(false);
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

  if (!session || session.user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Relationships</h1>
            <p className="mt-2 text-gray-600">
              Manage your assigned students and their application progress
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push('/teacher-dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Assigned</h3>
          <p className="text-gray-600 mb-4">
            You haven&apos;t been assigned any students yet. Contact your administrator to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {student.applications.length} applications
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        {student.studentProfile && (
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            {student.studentProfile.graduationYear && (
                              <span>Class of {student.studentProfile.graduationYear}</span>
                            )}
                            {student.studentProfile.gpa && (
                              <span>GPA: {student.studentProfile.gpa}</span>
                            )}
                            {student.studentProfile.satScore && (
                              <span>SAT: {student.studentProfile.satScore}</span>
                            )}
                            {student.studentProfile.actScore && (
                              <span>ACT: {student.studentProfile.actScore}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/teacher/profile/${student.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/applications?studentId=${student.id}`)}
                        className="text-sm text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        View Applications
                      </button>
                    </div>
                  </div>
                  
                  {student.applications.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Recent Applications
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {student.applications.slice(0, 3).map((app) => (
                          <div key={app.id} className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">{app.university.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                        {student.applications.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{student.applications.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
