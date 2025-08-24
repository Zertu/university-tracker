'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { UniversityWithParsedData } from '@/lib/services/university';

export default function UniversityDetailPage() {
  const params = useParams();
  const [university, setUniversity] = useState<UniversityWithParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUniversity = async () => {
      try {
        const response = await fetch(`/api/universities/${params.id}`);
        if (!response.ok) {
          throw new Error('University not found');
        }
        const data = await response.json();
        setUniversity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchUniversity();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading university details...</p>
        </div>
      </div>
    );
  }

  if (error || !university) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">University Not Found</h1>
          <p className="text-gray-600 mb-4">{error || 'The requested university could not be found.'}</p>
          <Link
            href="/universities"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  const formatDeadline = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{university.name}</h1>
              <p className="text-xl text-gray-600">
                {university.city}, {university.state && `${university.state}, `}{university.country}
              </p>
            </div>
            {university.usNewsRanking && (
              <div className="text-right">
                <div className="text-sm text-gray-500">US News Ranking</div>
                <div className="text-4xl font-bold text-blue-600">#{university.usNewsRanking}</div>
              </div>
            )}
          </div>

          {university.websiteUrl && (
            <a
              href={university.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Visit Official Website →
            </a>
          )}
        </div>

        {/* Key Statistics */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {university.acceptanceRate && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {(university.acceptanceRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Acceptance Rate</div>
              </div>
            )}
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600 mb-2">
                {university.applicationSystem}
              </div>
              <div className="text-sm text-gray-600">Application System</div>
            </div>

            {university.applicationFee && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  ${university.applicationFee}
                </div>
                <div className="text-sm text-gray-600">Application Fee</div>
              </div>
            )}
          </div>
        </div>

        {/* Tuition Information */}
        {(university.tuitionInState || university.tuitionOutState) && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Tuition & Fees</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {university.tuitionInState && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    ${university.tuitionInState.toLocaleString()}
                  </div>
                  <div className="text-gray-600">In-State Tuition</div>
                </div>
              )}
              {university.tuitionOutState && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    ${university.tuitionOutState.toLocaleString()}
                  </div>
                  <div className="text-gray-600">Out-of-State Tuition</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Application Deadlines */}
        {university.deadlines && Object.keys(university.deadlines).length > 0 && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Application Deadlines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(university.deadlines).map(([type, deadline]) => (
                <div key={type} className="p-4 border border-gray-200 rounded-lg">
                  <div className="font-semibold text-gray-900 mb-1">
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-gray-600">{formatDeadline(deadline)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Majors Offered */}
        {university.majorsOffered.length > 0 && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Majors Offered ({university.majorsOffered.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {university.majorsOffered.map((major) => (
                <div
                  key={major}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-center"
                >
                  {major}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add to Application List
            </button>
            <Link
              href={`/universities/compare?ids=${university.id}`}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Compare with Other Universities
            </Link>
            <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Save for Later
            </button>
            <Link
              href="/universities"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back to Search
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}