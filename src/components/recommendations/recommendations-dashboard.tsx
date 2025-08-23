'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RecommendationCard from './recommendation-card';
import { UniversityRecommendation, RecommendationStats } from '@/lib/services/recommendation';

interface RecommendationsDashboardProps {
  showFullList?: boolean;
}

export default function RecommendationsDashboard({ showFullList = false }: RecommendationsDashboardProps) {
  const [recommendations, setRecommendations] = useState<UniversityRecommendation[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const limit = showFullList ? 50 : 6;
      const response = await fetch(`/api/recommendations?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);
      setStats(data.stats);
      setProfileStats(data.profileStats);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = async (universityId: string) => {
    // This would integrate with the application system
    console.log('Adding university to application list:', universityId);
    // TODO: Implement add to application list functionality
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(showFullList ? 6 : 4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Recommendations</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        {error.includes('profile') ? (
          <Link
            href="/profile/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Complete Your Profile
          </Link>
        ) : (
          <button
            onClick={fetchRecommendations}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
        <p className="text-gray-600 mb-4">
          Complete your academic profile to get personalized university recommendations.
        </p>
        <Link
          href="/profile"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          View Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">University Recommendations</h2>
          <p className="text-gray-600">
            Personalized recommendations based on your academic profile
          </p>
        </div>
        {!showFullList && (
          <Link
            href="/recommendations"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View All
          </Link>
        )}
      </div>

      {/* Profile Summary */}
      {profileStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Your Academic Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Academic Level:</span>
              <span className="ml-2 font-medium capitalize">{profileStats.academicLevel}</span>
            </div>
            <div>
              <span className="text-blue-700">Competitiveness:</span>
              <span className="ml-2 font-medium">{Math.round(profileStats.competitiveness * 100)}%</span>
            </div>
            <div>
              <span className="text-blue-700">Target Countries:</span>
              <span className="ml-2 font-medium">{profileStats.preferences.countries.length}</span>
            </div>
            <div>
              <span className="text-blue-700">Intended Majors:</span>
              <span className="ml-2 font-medium">{profileStats.preferences.majors.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalRecommendations}</div>
            <div className="text-sm text-gray-600">Total Recommendations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.reachSchools}</div>
            <div className="text-sm text-gray-600">Reach Schools</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.targetSchools}</div>
            <div className="text-sm text-gray-600">Target Schools</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.safetySchools}</div>
            <div className="text-sm text-gray-600">Safety Schools</div>
          </div>
        </div>
      )}

      {/* Category Links */}
      {!showFullList && stats && (
        <div className="flex gap-4">
          <Link
            href="/recommendations/reach"
            className="flex-1 p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.reachSchools}</div>
              <div className="text-sm text-red-700">Reach Schools</div>
            </div>
          </Link>
          <Link
            href="/recommendations/target"
            className="flex-1 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{stats.targetSchools}</div>
              <div className="text-sm text-blue-700">Target Schools</div>
            </div>
          </Link>
          <Link
            href="/recommendations/safety"
            className="flex-1 p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.safetySchools}</div>
              <div className="text-sm text-green-700">Safety Schools</div>
            </div>
          </Link>
        </div>
      )}

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard
            key={`${recommendation.university.id}-${index}`}
            recommendation={recommendation}
            onAddToList={handleAddToList}
          />
        ))}
      </div>

      {/* View More */}
      {!showFullList && recommendations.length >= 6 && (
        <div className="text-center">
          <Link
            href="/recommendations"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View All Recommendations
            <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}