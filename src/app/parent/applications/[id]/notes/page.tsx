'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

interface ParentNote {
  id: string
  note: string
  createdAt: string
}

interface Application {
  id: string
  university: {
    name: string
    city: string
    state?: string
    country: string
  }
}

export default function ApplicationNotesPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
  const applicationId = params.id
  
  const [notes, setNotes] = useState<ParentNote[]>([])
  const [application, setApplication] = useState<Application | null>(null)
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user.role === 'parent' && applicationId) {
      fetchApplicationAndNotes()
    }
  }, [session, applicationId])

  const fetchApplicationAndNotes = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch application details and notes
      const [appResponse, notesResponse] = await Promise.all([
        fetch(`/api/applications/${applicationId}`),
        fetch(`/api/parent/notes/${applicationId}`)
      ])

      if (!appResponse.ok) {
        throw new Error('Failed to fetch application details')
      }

      if (!notesResponse.ok) {
        throw new Error('Failed to fetch notes')
      }

      const appData = await appResponse.json()
      const notesData = await notesResponse.json()

      setApplication(appData.application)
      setNotes(notesData.notes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newNote.trim()) {
      setError('Please enter a note')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      
      const response = await fetch(`/api/parent/notes/${applicationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          note: newNote.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add note')
      }

      const data = await response.json()
      setNotes([data.note, ...notes])
      setNewNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const response = await fetch(`/api/parent/notes/delete/${noteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== noteId))
      } else {
        throw new Error('Failed to delete note')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'parent') {
    return null
  }

  if (!childId) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Missing Child ID</h3>
            <p className="text-gray-500 mb-4">
              Please access this page through the parent dashboard.
            </p>
            <Link
              href="/parent-dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Notes</h1>
            {application && (
              <p className="text-gray-600 mt-2">
                Notes for {application.university.name}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href={`/parent/applications?childId=${childId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Applications
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {application && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {application.university.name}
              </h2>
              <p className="text-sm text-gray-500">
                {application.university.city}, {application.university.state || application.university.country}
              </p>
            </div>

            {/* Add New Note Form */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Note</h3>
              <form onSubmit={handleSubmitNote} className="space-y-4">
                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Note
                  </label>
                  <textarea
                    id="note"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add your thoughts, observations, or reminders about this application..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newNote.length}/2000 characters
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !newNote.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding Note...' : 'Add Note'}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Notes */}
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Previous Notes ({notes.length})
              </h3>
              
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No notes yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Add your first note using the form above
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}