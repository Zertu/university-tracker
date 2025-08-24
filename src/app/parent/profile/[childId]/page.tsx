'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import ProfileDisplay from '@/components/profile/profile-display';

interface Child {
  id: string;
  name: string;
  email: string;
  studentProfile?: {
    graduationYear?: number;
    gpa?: number;
    satScore?: number;
    actScore?: number;
    targetCountries?: string;
    intendedMajors?: string;
  };
}

export default function ParentChildProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'parent') {
      router.push('/dashboard');
      return;
    }

    fetchChildInfo();
  }, [session, status, router, childId]);

  const fetchChildInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/relationships`);
      if (!response.ok) {
        throw new Error('Failed to fetch children');
      }
      
      const data = await response.json();
      const foundChild = data.relationships
        .filter((rel: { child?: Child }) => rel.child && rel.child.id === childId)
        .map((rel: { child: Child }) => rel.child)[0];
      
      if (!foundChild) {
        setError('Child not found or access denied');
        return;
      }
      
      setChild(foundChild);
    } catch (error) {
      console.error('Error fetching child info:', error);
      setError('Failed to load child information');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'parent') {
    return null;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/parent-dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {child?.name}&apos;s Academic Profile
            </h1>
            <p className="mt-2 text-gray-600">
              View academic information for {child?.name}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push(`/parent/applications?childId=${childId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Applications
            </button>
            <button
              onClick={() => router.push('/parent-dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Child Info Card */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{child?.name}</h2>
            <p className="text-gray-600">{child?.email}</p>
            {child?.studentProfile && (
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                {child.studentProfile.graduationYear && (
                  <span>Graduation: {child.studentProfile.graduationYear}</span>
                )}
                {child.studentProfile.gpa && (
                  <span>GPA: {child.studentProfile.gpa}</span>
                )}
                {child.studentProfile.satScore && (
                  <span>SAT: {child.studentProfile.satScore}</span>
                )}
                {child.studentProfile.actScore && (
                  <span>ACT: {child.studentProfile.actScore}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Display */}
      <div className="bg-white shadow rounded-lg">
        <ProfileDisplay 
          showEditButton={false} 
          showCompletionStatus={false}
        />
      </div>
    </div>
  );
}
