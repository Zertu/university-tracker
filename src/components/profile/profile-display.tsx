'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProfileData {
  id: string;
  graduationYear?: number;
  gpa?: number;
  satScore?: number;
  actScore?: number;
  targetCountries: string[];
  intendedMajors: string[];
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface ProfileCompletion {
  hasBasicInfo: boolean;
  hasAcademicInfo: boolean;
  hasPreferences: boolean;
  completionPercentage: number;
  missingFields: string[];
}

interface ProfileDisplayProps {
  showEditButton?: boolean;
  showCompletionStatus?: boolean;
}

export default function ProfileDisplay({ 
  showEditButton = true, 
  showCompletionStatus = true 
}: ProfileDisplayProps) {
  const [isParentView, setIsParentView] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    if (showCompletionStatus) {
      fetchCompletion();
    }
  }, [showCompletionStatus]);

  const fetchProfile = async () => {
    try {
      // Check if we're viewing a child's profile (for parents)
      const urlParams = new URLSearchParams(window.location.search);
      let childId = urlParams.get('childId');
      
      // If no childId in query params, check if we're in parent profile route
      if (!childId) {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.includes('parent') && pathParts.includes('profile') && pathParts.length > 3) {
          childId = pathParts[pathParts.length - 1];
        }
      }
      
      const url = childId ? `/api/profile?childId=${childId}` : '/api/profile';
      const response = await fetch(url);
      
      if (response.status === 404) {
        setProfile(null);
        setError(null);
        setIsParentView(!!childId);
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setError(null);
      
      // Check if this is a parent viewing a child's profile
      setIsParentView(!!childId);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletion = async () => {
    try {
      // Check if we're viewing a child's profile (for parents)
      const urlParams = new URLSearchParams(window.location.search);
      const childId = urlParams.get('childId');
      
      // Only fetch completion for students viewing their own profile
      if (!childId) {
        const response = await fetch('/api/profile/completion');
        
        if (response.ok) {
          const data = await response.json();
          setCompletion(data.completion);
        }
      }
    } catch (error) {
      console.error('Error fetching completion:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Profile</h3>
          <p className="text-gray-600 mb-4">
            Create your academic profile to get personalized university recommendations.
          </p>
          <Link
            href="/profile/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Profile
          </Link>
        </div>
      </div>
    );
  }

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 bg-green-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isParentView ? 'Child Academic Profile' : 'Academic Profile'}
        </h2>
        {showEditButton && !isParentView && (
          <Link
            href="/profile/edit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Edit Profile
          </Link>
        )}
      </div>

      {/* Completion Status */}
      {showCompletionStatus && completion && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompletionColor(completion.completionPercentage)}`}>
              {completion.completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion.completionPercentage}%` }}
            ></div>
          </div>
          {completion.missingFields.length > 0 && (
            <p className="text-xs text-gray-600 mt-2">
              Missing: {completion.missingFields.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Profile Information */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{profile.user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expected Graduation</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.graduationYear || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        {/* Academic Scores */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Academic Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">GPA</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.gpa ? `${profile.gpa.toFixed(2)} / 4.0` : 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SAT Score</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.satScore || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ACT Score</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.actScore || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Target Countries */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Target Countries</h3>
          {profile.targetCountries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.targetCountries.map(country => (
                <span
                  key={country}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {country}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No target countries specified</p>
          )}
        </div>

        {/* Intended Majors */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Intended Majors</h3>
          {profile.intendedMajors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.intendedMajors.map(major => (
                <span
                  key={major}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                >
                  {major}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No intended majors specified</p>
          )}
        </div>

        {/* Profile Metadata */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {new Date(profile.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {new Date(profile.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}