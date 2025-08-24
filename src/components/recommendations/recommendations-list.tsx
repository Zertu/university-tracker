'use client';

import { useState, useEffect } from 'react';
import RecommendationCard from './recommendation-card';
import { UniversityRecommendation, RecommendationStats } from '@/lib/services/recommendation';

interface RecommendationsListProps {
  initialRecommendations?: UniversityRecommendation[];
  initialStats?: RecommendationStats;
  showFilters?: boolean;
  category?: 'reach' | 'target' | 'safety';
}

interface Filters {
  countries: string[];
  majors: string[];
  maxTuition?: number;
  applicationSystem?: string;
  category?: 'reach' | 'target' | 'safety';
}

export default function RecommendationsList({ 
  initialRecommendations = [],
  initialStats,
  showFilters = true,
  category
}: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<UniversityRecommendation[]>(initialRecommendations);
  const [stats, setStats] = useState<RecommendationStats | undefined>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    countries: [],
    majors: [],
    category,
  });

  useEffect(() => {
    if (initialRecommendations.length === 0) {
      fetchRecommendations();
    }
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.countries.length > 0) {
        queryParams.set('countries', filters.countries.join(','));
      }
      
      if (filters.majors.length > 0) {
        queryParams.set('majors', filters.majors.join(','));
      }
      
      if (filters.maxTuition) {
        queryParams.set('maxTuition', filters.maxTuition.toString());
      }
      
      if (filters.applicationSystem) {
        queryParams.set('applicationSystem', filters.applicationSystem);
      }

      let url = '/api/recommendations';
      if (category) {
        url = `/api/recommendations/category/${category}`;
      }

      const response = await fetch(`${url}?${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommendations');
      }

      const data = await response.json();
      
      if (category) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations(data.recommendations);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/recommendations/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        await fetchRecommendations();
      }
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = async (universityId: string) => {
    // This would integrate with the application system
    
    // TODO: Implement add to application list functionality
  };

  const getCategoryStats = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
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
    );
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Recommendations</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Available</h3>
        <p className="text-gray-600 mb-4">
          Complete your academic profile to get personalized university recommendations.
        </p>
        <button
          onClick={fetchRecommendations}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Recommendations
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      {!category && getCategoryStats()}

      {/* Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Schools` : 'Recommended Universities'}
          <span className="text-gray-500 ml-2">({recommendations.length})</span>
        </h2>
        <button
          onClick={handleRefreshRecommendations}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Recommendations Grid */}
      <div className="space-y-6">
        {recommendations.map((recommendation, index) => (
          <RecommendationCard
            key={`${recommendation.university.id}-${index}`}
            recommendation={recommendation}
            onAddToList={handleAddToList}
          />
        ))}
      </div>

      {/* Load More */}
      {recommendations.length >= 10 && (
        <div className="text-center mt-8">
          <button
            onClick={fetchRecommendations}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Load More Recommendations
          </button>
        </div>
      )}
    </div>
  );
}