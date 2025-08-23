'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { ApplicationForm } from '@/components/applications/application-form';

interface University {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string;
  deadlines: Record<string, string> | null;
}

export default function NewApplicationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'student') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch universities for the form using API route
      const fetchUniversities = async () => {
        try {
          const response = await fetch('/api/universities?limit=1000');
          if (!response.ok) {
            throw new Error('Failed to fetch universities');
          }
          const data = await response.json();
          setUniversities(data.universities || []);
        } catch (error) {
          console.error('Error fetching universities:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchUniversities();
    }
  }, [session?.user?.id]);

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!session || session.user.role !== 'student') {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with back button */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/applications"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Applications
              </Link>
            </div>
          </div>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Create New Application</h1>
            <p className="mt-2 text-gray-600">
              Add a new university to your application list
            </p>
          </div>
        </div>

        {/* Application Form */}
        <ApplicationForm 
          universities={universities} 
          onCancel={() => router.push('/applications')}
        />
      </div>
    </Layout>
  );
}