'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    graduationYear?: number;
    gpa?: number;
    satScore?: number;
    actScore?: number;
  };
  applications: Application[];
}

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
  requirements: Array<{
    id: string;
    status: string;
  }>;
}

interface TeacherNote {
  id: string;
  note: string;
  createdAt: string;
  application: {
    university: {
      name: string;
    };
    student: {
      name: string;
    };
  };
}

interface DashboardStats {
  totalStudents: number;
  totalApplications: number;
  submittedApplications: number;
  pendingApplications: number;
}

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [recentNotes, setRecentNotes] = useState<TeacherNote[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'applications' | 'notes'>('overview');

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
      fetchDashboardData();
    }
  }, [status, session, router]);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0]);
    }
  }, [students, selectedStudent]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teacher/dashboard');
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        const studentData = data.students.map((item: any) => item.student);
        console.log('Processed Students:', studentData);
        setStudents(studentData);
        setRecentNotes(data.recentNotes || []);
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  const getProgressPercentage = (requirements: any[] | undefined) => {
    if (!requirements || requirements.length === 0) return 0;
    const completed = requirements.filter(req => req.status === 'completed').length;
    return Math.round((completed / requirements.length) * 100);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Guide your students through their application journey
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push('/teacher/profile')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              View Profile
            </button>
            <button
              onClick={() => router.push('/teacher/profile/edit')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Student Selector */}
      {students.length > 0 && (
        <div className="mb-6">
          <label htmlFor="student-selector" className="block text-sm font-medium text-gray-700 mb-2">
            Select Student
          </label>
          <select
            id="student-selector"
            value={selectedStudent?.id || ''}
            onChange={(e) => {
              const student = students.find(s => s.id === e.target.value);
              setSelectedStudent(student || null);
            }}
            className="block w-full max-w-xs border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
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
      ) : selectedStudent ? (
        <>
          {/* Student Info Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedStudent.name}</h2>
                <p className="text-gray-600">{selectedStudent.email}</p>
                {selectedStudent.studentProfile && (
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                    {selectedStudent.studentProfile.graduationYear && (
                      <span>Graduation: {selectedStudent.studentProfile.graduationYear}</span>
                    )}
                    {selectedStudent.studentProfile.gpa && (
                      <span>GPA: {selectedStudent.studentProfile.gpa}</span>
                    )}
                    {selectedStudent.studentProfile.satScore && (
                      <span>SAT: {selectedStudent.studentProfile.satScore}</span>
                    )}
                    {selectedStudent.studentProfile.actScore && (
                      <span>ACT: {selectedStudent.studentProfile.actScore}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => router.push(`/teacher/profile/${selectedStudent.id}`)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  View Profile
                </button>
                <button
                  onClick={() => router.push(`/teacher/applications?studentId=${selectedStudent.id}`)}
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
                { id: 'students', name: 'All Students' },
                { id: 'applications', name: 'Applications' },
                { id: 'notes', name: 'Notes & Guidance' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'students' | 'applications' | 'notes')}
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dashboard Overview</h3>
                
                {/* Statistics */}
                {stats && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
                      <div className="text-sm text-blue-600">Total Students</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.totalApplications}</div>
                      <div className="text-sm text-green-600">Total Applications</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{stats.submittedApplications}</div>
                      <div className="text-sm text-yellow-600">Submitted</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{stats.pendingApplications}</div>
                      <div className="text-sm text-orange-600">Pending</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Applications */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Applications</h4>
                    <div className="space-y-2">
                      {selectedStudent.applications.slice(0, 3).map(app => (
                        <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <div className="font-medium">{app.university.name}</div>
                            <div className="text-sm text-gray-600">{app.applicationType ? app.applicationType.replace('_', ' ') : 'Unknown'}</div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status ? app.status.replace('_', ' ') : 'Unknown'}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {getProgressPercentage(app.requirements)}% complete
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Notes */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Guidance Notes</h4>
                    <div className="space-y-2">
                      {recentNotes.slice(0, 3).map(note => (
                        <div key={note.id} className="p-3 bg-gray-50 rounded">
                          <div className="text-sm text-gray-600 mb-1">
                            {note.application.student.name} - {note.application.university.name}
                          </div>
                          <div className="text-sm">{note.note.substring(0, 100)}...</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">All Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map(student => (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{student.name}</h4>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.applications.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.applications.length} apps
                        </span>
                      </div>
                      
                      {student.studentProfile && (
                        <div className="text-xs text-gray-500 mb-3">
                          {student.studentProfile.graduationYear && (
                            <span className="mr-2">Class of {student.studentProfile.graduationYear}</span>
                          )}
                          {student.studentProfile.gpa && (
                            <span>GPA: {student.studentProfile.gpa}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/teacher/profile/${student.id}`)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => router.push(`/teacher/applications?studentId=${student.id}`)}
                          className="text-xs text-green-600 hover:text-green-800"
                        >
                          View Applications
                        </button>
                      </div>
                    </div>
                  ))}
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
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedStudent.applications.map(app => (
                        <tr key={app.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{app.university.name}</div>
                              <div className="text-sm text-gray-500">{app.university.country}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {app.applicationType ? app.applicationType.replace('_', ' ') : 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(app.deadline).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status ? app.status.replace('_', ' ') : 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getProgressPercentage(app.requirements)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => router.push(`/teacher/applications/${app.id}/notes?studentId=${selectedStudent.id}`)}
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

            {activeTab === 'notes' && (
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Notes & Guidance</h3>
                  <button
                    onClick={() => router.push('/teacher/notes')}
                    className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Add Note
                  </button>
                </div>
                <div className="space-y-4">
                  {recentNotes.map(note => (
                    <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                        <div className="font-medium text-gray-900">
                          {note.application.student.name} - {note.application.university.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 sm:mt-0">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-gray-700">{note.note}</p>
                    </div>
                  ))}
                  {recentNotes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No guidance notes yet. Add notes to provide feedback and guidance to your students.
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Selected</h3>
          <p className="text-gray-600">
            Please select a student to view their application information.
          </p>
        </div>
      )}
    </div>
  );
}
