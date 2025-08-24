'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ParentNote {
  id: string;
  content: string;
  createdAt: string;
  application: {
    id: string;
    university: {
      name: string;
    };
  };
}

interface ParentNotesWidgetProps {
  childId: string;
  maxNotes?: number;
  showAddButton?: boolean;
}

export default function ParentNotesWidget({ 
  childId, 
  maxNotes = 5, 
  showAddButton = true 
}: ParentNotesWidgetProps) {
  const router = useRouter();
  const [notes, setNotes] = useState<ParentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [childId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/parent/notes?childId=${childId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = () => {
    router.push(`/parent/notes?childId=${childId}`);
  };

  const handleViewAllNotes = () => {
    router.push(`/parent/notes?childId=${childId}`);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchNotes}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayNotes = notes.slice(0, maxNotes);
  const hasMoreNotes = notes.length > maxNotes;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Recent Notes</h3>
            <p className="text-sm text-gray-600 mt-1">
              {notes.length} note{notes.length !== 1 ? 's' : ''} total
            </p>
          </div>
          {showAddButton && (
            <button
              onClick={handleAddNote}
              className="mt-2 sm:mt-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Note
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {displayNotes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-3">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">No Notes Yet</h4>
            <p className="text-sm text-gray-500 mb-4">
              Start adding notes to track important information about applications.
            </p>
            {showAddButton && (
              <button
                onClick={handleAddNote}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Your First Note
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayNotes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                  <div className="font-medium text-gray-900 text-sm">
                    {note.application.university.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{note.content}</p>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => router.push(`/parent/applications/${note.application.id}/notes?childId=${childId}`)}
                    className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Application →
                  </button>
                </div>
              </div>
            ))}

            {hasMoreNotes && (
              <div className="text-center pt-4 border-t border-gray-200">
                <button
                  onClick={handleViewAllNotes}
                  className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View All {notes.length} Notes →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
