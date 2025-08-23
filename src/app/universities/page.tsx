'use client';

import { useState, useEffect, useCallback } from 'react';
import { UniversityWithParsedData, UniversitySearchResult } from '@/lib/services/university';

interface SearchFilters {
  query: string;
  country: string;
  state: string;
  applicationSystem: string;
  minAcceptanceRate: string;
  maxAcceptanceRate: string;
  minRanking: string;
  maxRanking: string;
  maxTuition: string;
  majors: string[];
}

interface LocationOptions {
  countries: string[];
  states: Array<{ country: string; states: string[] }>;
}

interface PopularMajor {
  major: string;
  count: number;
}

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<UniversityWithParsedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [locationOptions, setLocationOptions] = useState<LocationOptions>({ countries: [], states: [] });
  const [popularMajors, setPopularMajors] = useState<PopularMajor[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    country: '',
    state: '',
    applicationSystem: '',
    minAcceptanceRate: '',
    maxAcceptanceRate: '',
    minRanking: '',
    maxRanking: '',
    maxTuition: '',
    majors: [],
  });

  // Load location options and popular majors on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [locationsRes, majorsRes] = await Promise.all([
          fetch('/api/universities?action=locations'),
          fetch('/api/universities?action=majors&limit=50'),
        ]);

        if (locationsRes.ok) {
          const locations = await locationsRes.json();
          setLocationOptions(locations);
        }

        if (majorsRes.ok) {
          const majors = await majorsRes.json();
          setPopularMajors(majors);
        }
      } catch (error) {
        console.error('Error loading options:', error);
      }
    };

    loadOptions();
  }, []);

  // Search universities
  const searchUniversities = useCallback(async (newSearch = false) => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      
      if (filters.query) searchParams.set('query', filters.query);
      if (filters.country) searchParams.set('country', filters.country);
      if (filters.state) searchParams.set('state', filters.state);
      if (filters.applicationSystem) searchParams.set('applicationSystem', filters.applicationSystem);
      if (filters.minAcceptanceRate) searchParams.set('minAcceptanceRate', filters.minAcceptanceRate);
      if (filters.maxAcceptanceRate) searchParams.set('maxAcceptanceRate', filters.maxAcceptanceRate);
      if (filters.minRanking) searchParams.set('minRanking', filters.minRanking);
      if (filters.maxRanking) searchParams.set('maxRanking', filters.maxRanking);
      if (filters.maxTuition) searchParams.set('maxTuition', filters.maxTuition);
      if (filters.majors.length > 0) searchParams.set('majors', filters.majors.join(','));
      
      const currentOffset = newSearch ? 0 : offset;
      searchParams.set('offset', currentOffset.toString());
      searchParams.set('limit', '20');

      const response = await fetch(`/api/universities?${searchParams}`);
      if (!response.ok) throw new Error('Search failed');

      const result: UniversitySearchResult = await response.json();
      
      if (newSearch) {
        setUniversities(result.universities);
        setOffset(20);
      } else {
        setUniversities(prev => [...prev, ...result.universities]);
        setOffset(prev => prev + 20);
      }
      
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  // Initial search
  useEffect(() => {
    searchUniversities(true);
  }, []);

  // Handle filter changes
  const handleFilterChange = (key: keyof SearchFilters, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle search
  const handleSearch = () => {
    setOffset(0);
    searchUniversities(true);
  };

  // Handle major toggle
  const toggleMajor = (major: string) => {
    setFilters(prev => ({
      ...prev,
      majors: prev.majors.includes(major)
        ? prev.majors.filter(m => m !== major)
        : [...prev.majors, major]
    }));
  };

  // Get states for selected country
  const getStatesForCountry = (country: string) => {
    const countryData = locationOptions.states.find(s => s.country === country);
    return countryData?.states || [];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">University Search</h1>
          
          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Search universities, cities, or countries..."
                value={filters.query}
                onChange={(e) => handleFilterChange('query', e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={filters.country}
                    onChange={(e) => {
                      handleFilterChange('country', e.target.value);
                      handleFilterChange('state', ''); // Reset state when country changes
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Countries</option>
                    {locationOptions.countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>

                  <select
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                    disabled={!filters.country}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                  >
                    <option value="">All States</option>
                    {getStatesForCountry(filters.country).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>

                  <select
                    value={filters.applicationSystem}
                    onChange={(e) => handleFilterChange('applicationSystem', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Application Systems</option>
                    <option value="Common App">Common App</option>
                    <option value="Coalition">Coalition</option>
                    <option value="Direct">Direct</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <input
                    type="number"
                    placeholder="Min Acceptance Rate (%)"
                    value={filters.minAcceptanceRate}
                    onChange={(e) => handleFilterChange('minAcceptanceRate', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    max="100"
                  />
                  <input
                    type="number"
                    placeholder="Max Acceptance Rate (%)"
                    value={filters.maxAcceptanceRate}
                    onChange={(e) => handleFilterChange('maxAcceptanceRate', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                    max="100"
                  />
                  <input
                    type="number"
                    placeholder="Min Ranking"
                    value={filters.minRanking}
                    onChange={(e) => handleFilterChange('minRanking', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Max Tuition ($)"
                    value={filters.maxTuition}
                    onChange={(e) => handleFilterChange('maxTuition', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>

                {/* Major Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Majors (select multiple):
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {popularMajors.slice(0, 20).map(({ major }) => (
                      <button
                        key={major}
                        onClick={() => toggleMajor(major)}
                        className={`px-3 py-1 text-sm rounded-full border ${
                          filters.majors.includes(major)
                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {major}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="text-gray-600 mb-4">
            {total > 0 ? `Found ${total} universities` : 'No universities found'}
          </div>
        </div>

        {/* University Results */}
        <div className="space-y-6">
          {universities.map((university) => (
            <div key={university.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {university.name}
                  </h3>
                  <p className="text-gray-600">
                    {university.city}, {university.state && `${university.state}, `}{university.country}
                  </p>
                </div>
                {university.usNewsRanking && (
                  <div className="text-right">
                    <div className="text-sm text-gray-500">US News Ranking</div>
                    <div className="text-2xl font-bold text-blue-600">#{university.usNewsRanking}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {university.acceptanceRate && (
                  <div>
                    <div className="text-sm text-gray-500">Acceptance Rate</div>
                    <div className="font-semibold">{(university.acceptanceRate * 100).toFixed(1)}%</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500">Application System</div>
                  <div className="font-semibold">{university.applicationSystem}</div>
                </div>
                {(university.tuitionInState || university.tuitionOutState) && (
                  <div>
                    <div className="text-sm text-gray-500">Tuition</div>
                    <div className="font-semibold">
                      {university.tuitionInState && university.tuitionOutState && university.tuitionInState !== university.tuitionOutState
                        ? `$${university.tuitionInState.toLocaleString()} / $${university.tuitionOutState.toLocaleString()}`
                        : `$${(university.tuitionInState || university.tuitionOutState)?.toLocaleString()}`
                      }
                    </div>
                  </div>
                )}
              </div>

              {university.majorsOffered.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">Popular Majors</div>
                  <div className="flex flex-wrap gap-2">
                    {university.majorsOffered.slice(0, 5).map((major) => (
                      <span
                        key={major}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
                      >
                        {major}
                      </span>
                    ))}
                    {university.majorsOffered.length > 5 && (
                      <span className="px-2 py-1 text-gray-500 text-sm">
                        +{university.majorsOffered.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                {university.websiteUrl && (
                  <a
                    href={university.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Visit Website →
                  </a>
                )}
                <div className="flex gap-2">
                  <a
                    href={`/universities/${university.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    View Details
                  </a>
                  <button
                    onClick={() => {
                      const currentUrl = new URL('/universities/compare', window.location.origin);
                      currentUrl.searchParams.set('ids', university.id);
                      window.open(currentUrl.toString(), '_blank');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Compare
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={() => searchUniversities(false)}
              disabled={loading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}