'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UniversityWithParsedData } from '@/lib/services/university';

interface ComparisonData {
  universities: UniversityWithParsedData[];
}

interface SavedComparison {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  universities: Array<{
    id: string;
    name: string;
    city: string;
    state?: string;
    country: string;
  }>;
}

export default function UniversityComparePage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [universities, setUniversities] = useState<UniversityWithParsedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UniversityWithParsedData[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState<SavedComparison[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Load universities from URL parameters
  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) {
      const universityIds = ids.split(',').filter(id => id.trim());
      if (universityIds.length >= 2) {
        loadComparison(universityIds);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // Load saved comparisons when user is authenticated
  useEffect(() => {
    if (session?.user) {
      loadSavedComparisons();
    }
  }, [session]);

  const loadComparison = async (universityIds: string[]) => {
    try {
      setLoading(true);
      const response = await fetch('/api/universities/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universityIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to load comparison');
      }

      const data: ComparisonData = await response.json();
      setUniversities(data.universities);
      setSelectedUniversities(universityIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedComparisons = async () => {
    try {
      const response = await fetch('/api/comparisons');
      if (response.ok) {
        const data = await response.json();
        setSavedComparisons(data.comparisons || []);
      }
    } catch (error) {
      console.error('Failed to load saved comparisons:', error);
    }
  };

  const saveComparison = async () => {
    if (!saveForm.name.trim() || selectedUniversities.length < 2) return;

    try {
      setSaving(true);
      const response = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveForm.name,
          description: saveForm.description,
          universityIds: selectedUniversities,
        }),
      });

      if (response.ok) {
        setShowSaveModal(false);
        setSaveForm({ name: '', description: '' });
        loadSavedComparisons();
        alert('Comparison saved successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save comparison');
      }
    } catch (error) {
      console.error('Save comparison error:', error);
      alert('Failed to save comparison');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedComparison = (comparison: SavedComparison) => {
    const universityIds = comparison.universities.map(u => u.id);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('ids', universityIds.join(','));
    window.history.pushState({}, '', newUrl.toString());
    loadComparison(universityIds);
  };

  const deleteSavedComparison = async (comparisonId: string) => {
    if (!confirm('Are you sure you want to delete this saved comparison?')) return;

    try {
      const response = await fetch(`/api/comparisons/${comparisonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadSavedComparisons();
      } else {
        alert('Failed to delete comparison');
      }
    } catch (error) {
      console.error('Delete comparison error:', error);
      alert('Failed to delete comparison');
    }
  };

  const searchUniversities = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/universities?query=${encodeURIComponent(query)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.universities || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const addUniversityToComparison = (university: UniversityWithParsedData) => {
    if (selectedUniversities.includes(university.id)) return;
    if (selectedUniversities.length >= 5) {
      alert('Maximum 5 universities can be compared at once');
      return;
    }

    const newIds = [...selectedUniversities, university.id];
    setSelectedUniversities(newIds);
    setUniversities(prev => [...prev, university]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);

    // Update URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('ids', newIds.join(','));
    window.history.pushState({}, '', newUrl.toString());
  };

  const removeUniversityFromComparison = (universityId: string) => {
    const newIds = selectedUniversities.filter(id => id !== universityId);
    setSelectedUniversities(newIds);
    setUniversities(prev => prev.filter(u => u.id !== universityId));

    // Update URL
    const newUrl = new URL(window.location.href);
    if (newIds.length > 0) {
      newUrl.searchParams.set('ids', newIds.join(','));
    } else {
      newUrl.searchParams.delete('ids');
    }
    window.history.pushState({}, '', newUrl.toString());
  };

  const formatDeadline = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getComparisonValue = (university: UniversityWithParsedData, field: string) => {
    switch (field) {
      case 'acceptanceRate':
        return university.acceptanceRate ? `${(university.acceptanceRate * 100).toFixed(1)}%` : 'N/A';
      case 'ranking':
        return university.usNewsRanking ? `#${university.usNewsRanking}` : 'Unranked';
      case 'tuition':
        if (university.tuitionInState && university.tuitionOutState && university.tuitionInState !== university.tuitionOutState) {
          return `$${university.tuitionInState.toLocaleString()} / $${university.tuitionOutState.toLocaleString()}`;
        }
        return university.tuitionInState || university.tuitionOutState 
          ? `$${(university.tuitionInState || university.tuitionOutState)?.toLocaleString()}`
          : 'N/A';
      case 'applicationFee':
        return university.applicationFee ? `$${university.applicationFee}` : 'N/A';
      case 'applicationSystem':
        return university.applicationSystem;
      case 'location':
        return `${university.city}, ${university.state ? `${university.state}, ` : ''}${university.country}`;
      default:
        return 'N/A';
    }
  };

  const getBestValue = (field: string): { value: unknown; isHigherBetter: boolean } => {
    const values = universities.map(u => {
      switch (field) {
        case 'acceptanceRate':
          return u.acceptanceRate;
        case 'ranking':
          return u.usNewsRanking;
        case 'tuition':
          return u.tuitionInState || u.tuitionOutState;
        case 'applicationFee':
          return u.applicationFee;
        default:
          return null;
      }
    }).filter(v => v !== null && v !== undefined);

    if (values.length === 0) return { value: null, isHigherBetter: false };

    switch (field) {
      case 'acceptanceRate':
        return { value: Math.max(...values), isHigherBetter: true };
      case 'ranking':
        return { value: Math.min(...values), isHigherBetter: false };
      case 'tuition':
      case 'applicationFee':
        return { value: Math.min(...values), isHigherBetter: false };
      default:
        return { value: null, isHigherBetter: false };
    }
  };

  const isHighlightedValue = (university: UniversityWithParsedData, field: string): boolean => {
    const bestValue = getBestValue(field);
    if (bestValue.value === null) return false;

    const currentValue = (() => {
      switch (field) {
        case 'acceptanceRate':
          return university.acceptanceRate;
        case 'ranking':
          return university.usNewsRanking;
        case 'tuition':
          return university.tuitionInState || university.tuitionOutState;
        case 'applicationFee':
          return university.applicationFee;
        default:
          return null;
      }
    })();

    return currentValue === bestValue.value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">University Comparison</h1>
          
          {/* Saved Comparisons */}
          {session?.user && savedComparisons.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Saved Comparisons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedComparisons.map((comparison) => (
                  <div key={comparison.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{comparison.name}</h3>
                      <button
                        onClick={() => deleteSavedComparison(comparison.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                    {comparison.description && (
                      <p className="text-sm text-gray-600 mb-2">{comparison.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mb-3">
                      {comparison.universities.map(u => u.name).join(', ')}
                    </div>
                    <button
                      onClick={() => loadSavedComparison(comparison)}
                      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Load Comparison
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add Universities */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Compare Universities</h2>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add University
              </button>
            </div>

            {showSearch && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search universities to add..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUniversities(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((university) => (
                        <button
                          key={university.id}
                          onClick={() => addUniversityToComparison(university)}
                          disabled={selectedUniversities.includes(university.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{university.name}</div>
                          <div className="text-sm text-gray-600">
                            {university.city}, {university.state && `${university.state}, `}{university.country}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {universities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {universities.map((university) => (
                  <div
                    key={university.id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg"
                  >
                    <span className="font-medium">{university.name}</span>
                    <button
                      onClick={() => removeUniversityFromComparison(university.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {universities.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">No Universities Selected</h2>
            <p className="text-gray-600 mb-4">
              Add at least 2 universities to start comparing them side by side.
            </p>
            <button
              onClick={() => setShowSearch(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Universities
            </button>
          </div>
        )}

        {universities.length === 1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Add at least one more university to enable comparison.</p>
          </div>
        )}

        {universities.length >= 2 && (
          <>
            {/* Key Metrics Visualization */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Metrics Comparison</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Acceptance Rate Chart */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Acceptance Rate</h4>
                  <div className="space-y-3">
                    {universities.map((university) => {
                      const rate = university.acceptanceRate;
                      const percentage = rate ? rate * 100 : 0;
                      const isHighest = isHighlightedValue(university, 'acceptanceRate');
                      return (
                        <div key={university.id} className="flex items-center">
                          <div className="w-24 text-xs text-gray-600 truncate">
                            {university.name}
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className={`h-4 rounded-full ${
                                  isHighest ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className={`w-12 text-xs text-right ${
                            isHighest ? 'text-green-600 font-semibold' : 'text-gray-600'
                          }`}>
                            {rate ? `${percentage.toFixed(1)}%` : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ranking Chart */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">US News Ranking</h4>
                  <div className="space-y-3">
                    {universities.map((university) => {
                      const ranking = university.usNewsRanking;
                      const normalizedRank = ranking ? Math.max(0, 100 - ranking) : 0;
                      const isBest = isHighlightedValue(university, 'ranking');
                      return (
                        <div key={university.id} className="flex items-center">
                          <div className="w-24 text-xs text-gray-600 truncate">
                            {university.name}
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className={`h-4 rounded-full ${
                                  isBest ? 'bg-green-500' : 'bg-purple-500'
                                }`}
                                style={{ width: `${Math.max(normalizedRank, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className={`w-12 text-xs text-right ${
                            isBest ? 'text-green-600 font-semibold' : 'text-gray-600'
                          }`}>
                            {ranking ? `#${ranking}` : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tuition Chart */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Annual Tuition</h4>
                  <div className="space-y-3">
                    {universities.map((university) => {
                      const tuition = university.tuitionInState || university.tuitionOutState;
                      const maxTuition = Math.max(...universities.map(u => u.tuitionInState || u.tuitionOutState || 0));
                      const percentage = tuition && maxTuition ? (tuition / maxTuition) * 100 : 0;
                      const isLowest = isHighlightedValue(university, 'tuition');
                      return (
                        <div key={university.id} className="flex items-center">
                          <div className="w-24 text-xs text-gray-600 truncate">
                            {university.name}
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className={`h-4 rounded-full ${
                                  isLowest ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className={`w-16 text-xs text-right ${
                            isLowest ? 'text-green-600 font-semibold' : 'text-gray-600'
                          }`}>
                            {tuition ? `$${tuition.toLocaleString()}` : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Application Fee Chart */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Application Fee</h4>
                  <div className="space-y-3">
                    {universities.map((university) => {
                      const fee = university.applicationFee;
                      const maxFee = Math.max(...universities.map(u => u.applicationFee || 0));
                      const percentage = fee && maxFee ? (fee / maxFee) * 100 : 0;
                      const isLowest = isHighlightedValue(university, 'applicationFee');
                      return (
                        <div key={university.id} className="flex items-center">
                          <div className="w-24 text-xs text-gray-600 truncate">
                            {university.name}
                          </div>
                          <div className="flex-1 mx-3">
                            <div className="bg-gray-200 rounded-full h-4 relative">
                              <div
                                className={`h-4 rounded-full ${
                                  isLowest ? 'bg-green-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className={`w-12 text-xs text-right ${
                            isLowest ? 'text-green-600 font-semibold' : 'text-gray-600'
                          }`}>
                            {fee ? `$${fee}` : 'N/A'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500 flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Best value highlighted with green color and star (★) symbol
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 z-10">
                      Criteria
                    </th>
                    {universities.map((university) => (
                      <th key={university.id} className="px-6 py-4 text-center text-sm font-medium text-gray-900 min-w-48">
                        <div className="font-semibold">{university.name}</div>
                        <div className="text-xs text-gray-600 font-normal">
                          {university.city}, {university.country}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      US News Ranking
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className={`px-6 py-4 text-center text-sm ${
                        isHighlightedValue(university, 'ranking') 
                          ? 'bg-green-50 text-green-800 font-semibold' 
                          : 'text-gray-900'
                      }`}>
                        {getComparisonValue(university, 'ranking')}
                        {isHighlightedValue(university, 'ranking') && (
                          <span className="ml-1 text-green-600">★</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Acceptance Rate
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className={`px-6 py-4 text-center text-sm ${
                        isHighlightedValue(university, 'acceptanceRate') 
                          ? 'bg-green-50 text-green-800 font-semibold' 
                          : 'text-gray-900'
                      }`}>
                        {getComparisonValue(university, 'acceptanceRate')}
                        {isHighlightedValue(university, 'acceptanceRate') && (
                          <span className="ml-1 text-green-600">★</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Tuition
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className={`px-6 py-4 text-center text-sm ${
                        isHighlightedValue(university, 'tuition') 
                          ? 'bg-green-50 text-green-800 font-semibold' 
                          : 'text-gray-900'
                      }`}>
                        {getComparisonValue(university, 'tuition')}
                        {isHighlightedValue(university, 'tuition') && (
                          <span className="ml-1 text-green-600">★</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Application Fee
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className={`px-6 py-4 text-center text-sm ${
                        isHighlightedValue(university, 'applicationFee') 
                          ? 'bg-green-50 text-green-800 font-semibold' 
                          : 'text-gray-900'
                      }`}>
                        {getComparisonValue(university, 'applicationFee')}
                        {isHighlightedValue(university, 'applicationFee') && (
                          <span className="ml-1 text-green-600">★</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Application System
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className="px-6 py-4 text-center text-sm text-gray-900">
                        {getComparisonValue(university, 'applicationSystem')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Location
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className="px-6 py-4 text-center text-sm text-gray-900">
                        {getComparisonValue(university, 'location')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Application Deadlines
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className="px-6 py-4 text-center text-sm text-gray-900">
                        {university.deadlines && Object.keys(university.deadlines).length > 0 ? (
                          <div className="space-y-1">
                            {Object.entries(university.deadlines).map(([type, deadline]) => (
                              <div key={type} className="text-xs">
                                <span className="font-medium">
                                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                </span>{' '}
                                {formatDeadline(String(deadline))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Popular Majors
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className="px-6 py-4 text-center text-sm text-gray-900">
                        {university.majorsOffered.length > 0 ? (
                          <div className="space-y-1">
                            {university.majorsOffered.slice(0, 5).map((major) => (
                              <div key={major} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {major}
                              </div>
                            ))}
                            {university.majorsOffered.length > 5 && (
                              <div className="text-xs text-gray-500">
                                +{university.majorsOffered.length - 5} more
                              </div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      Actions
                    </td>
                    {universities.map((university) => (
                      <td key={university.id} className="px-6 py-4 text-center">
                        <div className="space-y-2">
                          <a
                            href={`/universities/${university.id}`}
                            className="block px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            View Details
                          </a>
                          {university.websiteUrl && (
                            <a
                              href={university.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-3 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            >
                              Visit Website
                            </a>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {universities.length >= 2 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save & Share Comparison</h3>
            <div className="space-y-4">
              {session?.user && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Comparison
                  </button>
                  <span className="text-sm text-gray-600">Save this comparison for later access</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Comparison Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Comparison</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comparison Name *
                  </label>
                  <input
                    type="text"
                    value={saveForm.name}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Top Engineering Schools"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={saveForm.description}
                    onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add notes about this comparison..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Universities: {universities.map(u => u.name).join(', ')}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveForm({ name: '', description: '' });
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveComparison}
                  disabled={!saveForm.name.trim() || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}