import { Metadata } from 'next';
import ProfileDisplay from '@/components/profile/profile-display';

export const metadata: Metadata = {
  title: 'Academic Profile | University Application Tracker',
  description: 'View and manage your academic profile for university applications',
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Academic Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your academic information to get personalized university recommendations.
          </p>
        </div>

        <ProfileDisplay />
      </div>
    </div>
  );
}