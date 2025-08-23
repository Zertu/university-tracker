import { Metadata } from 'next';
import RecommendationsDashboard from '@/components/recommendations/recommendations-dashboard';

export const metadata: Metadata = {
  title: 'University Recommendations | University Application Tracker',
  description: 'Get personalized university recommendations based on your academic profile',
};

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RecommendationsDashboard showFullList={true} />
      </div>
    </div>
  );
}