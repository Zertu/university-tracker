'use client';

import Link from 'next/link';
import { UniversityRecommendation } from '@/lib/services/recommendation';

interface RecommendationCardProps {
  recommendation: UniversityRecommendation;
  showAddToList?: boolean;
  onAddToList?: (universityId: string) => void;
}

export default function RecommendationCard({ 
  recommendation, 
  showAddToList = true,
  onAddToList 
}: RecommendationCardProps) {
  const { university, matchScore, matchLikelihood, reasons, category } = recommendation;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'reach':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'target':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'safety':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMatchLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTuition = (tuition: number | null) => {
    if (!tuition) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(tuition);
  };

  const parseMajors = (majorsJson: string | null): string[] => {
    if (!majorsJson) return [];
    try {
      return JSON.parse(majorsJson);
    } catch {
      return [];
    }
  };

  const majors = parseMajors(university.majorsOffered);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{university.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(category)}`}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
          </div>
          <p className="text-gray-600">
            {university.city}, {university.state && `${university.state}, `}{university.country}
          </p>
        </div>
        
        {/* Match Score */}
        <div className="text-right">
          <div className={`text-2xl font-bold ${getMatchScoreColor(matchScore)}`}>
            {matchScore}%
          </div>
          <div className="text-sm text-gray-500">Match Score</div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="text-sm text-gray-600">Acceptance Rate</div>
          <div className="font-semibold">
            {university.acceptanceRate ? `${university.acceptanceRate}%` : 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">US News Ranking</div>
          <div className="font-semibold">
            {university.usNewsRanking ? `#${university.usNewsRanking}` : 'Unranked'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Tuition (Out-of-State)</div>
          <div className="font-semibold">
            {formatTuition(university.tuitionOutState)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Application System</div>
          <div className="font-semibold">{university.applicationSystem}</div>
        </div>
      </div>

      {/* Match Likelihood */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-700">Match Likelihood:</span>
          <span className={`font-semibold capitalize ${getMatchLikelihoodColor(matchLikelihood)}`}>
            {matchLikelihood}
          </span>
        </div>
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Why this is a good match:</h4>
        <ul className="space-y-1">
          {reasons.slice(0, 3).map((reason, index) => (
            <li key={index} className="text-sm text-gray-600 flex items-start">
              <span className="text-green-500 mr-2">•</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Sample Majors */}
      {majors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Popular Majors:</h4>
          <div className="flex flex-wrap gap-1">
            {majors.slice(0, 4).map((major, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {major}
              </span>
            ))}
            {majors.length > 4 && (
              <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                +{majors.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Link
          href={`/universities/${university.id}`}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
        >
          View Details
        </Link>
        {showAddToList && onAddToList && (
          <button
            onClick={() => onAddToList(university.id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Add to List
          </button>
        )}
        {university.websiteUrl && (
          <a
            href={university.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Visit Website
          </a>
        )}
      </div>
    </div>
  );
}