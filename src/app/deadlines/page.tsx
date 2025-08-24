import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-config';
import { DeadlineAlerts } from '@/components/deadlines/deadline-alerts';
import { DeadlineCalendar } from '@/components/deadlines/deadline-calendar';
import { DeadlineSummaryWidget } from '@/components/deadlines/deadline-summary';

export const metadata: Metadata = {
  title: 'Deadlines | University Tracker',
  description: 'Track and manage your application deadlines and requirements.',
};

export default async function DeadlinesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'student') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deadline Management</h1>
          <p className="mt-2 text-gray-600">
            Stay on top of your application deadlines and requirements
          </p>
        </div>

        {/* Summary Section */}
        <div className="mb-8">
          <DeadlineSummaryWidget className="max-w-md" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Alerts */}
          <div className="lg:col-span-1 space-y-6">
            {/* Critical Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Critical Deadlines
              </h2>
              <DeadlineAlerts 
                daysAhead={7}
                includeRequirements={true}
                showTitle={false}
                maxItems={5}
              />
            </div>

            {/* Upcoming Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming (30 days)
              </h2>
              <DeadlineAlerts 
                daysAhead={30}
                includeRequirements={true}
                showTitle={false}
                maxItems={10}
              />
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-2">
            <div className="relative">
              <DeadlineCalendar showNavigation={true} />
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Deadline Management Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Set up a dedicated workspace for each application</span>
              </div>
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Start working on applications at least 2 months before deadlines</span>
              </div>
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Create a checklist for each application requirement</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Set reminders for important dates and milestones</span>
              </div>
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Keep all documents organized in one place</span>
              </div>
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Double-check time zones for deadline submissions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}