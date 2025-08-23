import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { ApplicationService } from '@/lib/services/application';
import { StatusWorkflow } from '@/components/applications/status-workflow';
import { StatusHistory } from '@/components/applications/status-history';
import Link from 'next/link';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  if (session.user.role !== 'student') {
    redirect('/dashboard');
  }

  let application;
  try {
    application = await ApplicationService.getApplicationById(
      resolvedParams.id,
      session.user.id
    );
  } catch (error) {
    console.error('Error fetching application:', error);
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Found</h1>
            <p className="text-gray-600 mb-8">
              The application you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link
              href="/applications"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ← Back to Applications
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDeadlineStatus = (deadline: Date | string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { status: 'overdue', text: 'Overdue', color: 'text-red-600' };
    } else if (daysUntil <= 7) {
      return { status: 'urgent', text: `${daysUntil} days left`, color: 'text-orange-600' };
    } else if (daysUntil <= 30) {
      return { status: 'upcoming', text: `${daysUntil} days left`, color: 'text-yellow-600' };
    } else {
      return { status: 'future', text: `${daysUntil} days left`, color: 'text-green-600' };
    }
  };

  const deadlineStatus = getDeadlineStatus(application.deadline);
  const completedRequirements = application.requirements?.filter(req => req.status === 'completed').length || 0;
  const totalRequirements = application.requirements?.length || 0;
  const progressPercentage = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/applications"
                className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
              >
                ← Back to Applications
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                {application.university.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {application.applicationType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Application
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">Deadline</div>
              <div className="text-lg font-semibold">{formatDate(application.deadline)}</div>
              <div className={`text-sm font-medium ${deadlineStatus.color}`}>
                {deadlineStatus.text}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Workflow */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Application Status</h2>
              <StatusWorkflow
                currentStatus={application.status as any}
                applicationId={application.id}
                onStatusChange={() => window.location.reload()}
              />
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Requirements</h2>
                <div className="text-sm text-gray-500">
                  {completedRequirements} of {totalRequirements} completed
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Requirements List */}
              {application.requirements && application.requirements.length > 0 ? (
                <div className="space-y-4">
                  {application.requirements.map((requirement) => (
                    <div
                      key={requirement.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{requirement.title}</h3>
                        {requirement.description && (
                          <p className="text-sm text-gray-600 mt-1">{requirement.description}</p>
                        )}
                        {requirement.deadline && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {formatDate(requirement.deadline)}
                          </p>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <span className={`
                          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${requirement.status === 'completed' ? 'bg-green-100 text-green-800' :
                            requirement.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}
                        `}>
                          {requirement.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No requirements defined yet.
                </div>
              )}
            </div>

            {/* Status History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <StatusHistory applicationId={application.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* University Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">University Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Location</div>
                  <div className="font-medium">
                    {application.university.city}, {application.university.state || application.university.country}
                  </div>
                </div>
                
                {application.university.usNewsRanking && (
                  <div>
                    <div className="text-sm text-gray-500">US News Ranking</div>
                    <div className="font-medium">#{application.university.usNewsRanking}</div>
                  </div>
                )}
                
                {application.university.acceptanceRate && (
                  <div>
                    <div className="text-sm text-gray-500">Acceptance Rate</div>
                    <div className="font-medium">{(application.university.acceptanceRate * 100).toFixed(1)}%</div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-gray-500">Application System</div>
                  <div className="font-medium">{application.university.applicationSystem}</div>
                </div>
              </div>
            </div>

            {/* Application Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="font-medium">{formatDate(application.createdAt)}</div>
                </div>
                
                {application.submittedDate && (
                  <div>
                    <div className="text-sm text-gray-500">Submitted</div>
                    <div className="font-medium">{formatDate(application.submittedDate)}</div>
                  </div>
                )}
                
                {application.decisionDate && (
                  <div>
                    <div className="text-sm text-gray-500">Decision Date</div>
                    <div className="font-medium">{formatDate(application.decisionDate)}</div>
                  </div>
                )}
                
                {application.decisionType && (
                  <div>
                    <div className="text-sm text-gray-500">Decision</div>
                    <div className={`font-medium capitalize ${
                      application.decisionType === 'accepted' ? 'text-green-600' :
                      application.decisionType === 'rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {application.decisionType}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {application.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{application.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}