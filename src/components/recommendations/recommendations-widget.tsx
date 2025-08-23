'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UniversityRecommendation } from '@/lib/services/recommendation';

interface RecommendationsWidgetProps {
  limit?: number;
}

export default function RecommendationsWidget({ limit = 3 }: RecommendationsWidgetProps) {
  const [recommendations, setRecommendations] = useState<UniversityRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recommendations?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'reach':
        return 'bg-red-100 text-red-800';
      case 'target':
        return 'bg-blue-100 text-blue-800';
      case 'safety':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recommended Universities</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 w-12 bg-gray-200 rounded"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                  <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recommended Universities</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-3">{error}</p>
            {error.includes('profile') ? (
              <Link
                href="/profile/create"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Complete Your Profile
              </Link>
            ) : (
              <button
                onClick={fetchRecommendations}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recommended Universities</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center py-4">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-3">No recommendations available</p>
            <Link
              href="/profile"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Complete Your Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recommended Universities</h2>
          <Link
            href="/recommendations"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div key={`${recommendation.university.id}-${index}`} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {recommendation.university.name}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {recommendation.university.city}, {recommendation.university.country}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <div className={`text-lg font-bold ${getMatchScoreColor(recommendation.matchScore)}`}>
                    {recommendation.matchScore}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(recommendation.category)}`}>
                  {recommendation.category.charAt(0).toUpperCase() + recommendation.category.slice(1)}
                </span>
                <span className="text-xs text-gray-500">
                  {recommendation.university.acceptanceRate ? `${recommendation.university.acceptanceRate}% acceptance` : 'Acceptance rate N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-600 truncate flex-1">
                  {recommendation.reasons[0]}
                </p>
                <Link
                  href={`/universities/${recommendation.university.id}`}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>

        {recommendations.length >= limit && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link
              href="/recommendations"
              className="block w-full text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm"
            >
              View All Recommendations
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}