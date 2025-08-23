import { Metadata } from 'next';
import ProfileForm from '@/components/profile/profile-form';

export const metadata: Metadata = {
  title: 'Create Academic Profile | University Application Tracker',
  description: 'Create your academic profile to get personalized university recommendations',
};

export default function CreateProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Academic Profile</h1>
          <p className="mt-2 text-gray-600">
            Tell us about your academic background to get personalized university recommendations.
          </p>
        </div>

        <ProfileForm />
      </div>
    </div>
  );
}