import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { searchUniversities } from '@/lib/services/university';
import { ApplicationForm } from '@/components/applications/application-form';

export const metadata: Metadata = {
  title: 'New Application | University Tracker',
  description: 'Create a new university application.',
};

export default async function NewApplicationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'student') {
    redirect('/dashboard');
  }

  // Fetch universities for the form
  const { universities } = await searchUniversities({
    limit: 1000, // Get all universities for the dropdown
    offset: 0
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Application</h1>
          <p className="mt-2 text-gray-600">
            Add a new university to your application list
          </p>
        </div>

        {/* Application Form */}
        <ApplicationForm universities={universities} />
      </div>
    </div>
  );
}