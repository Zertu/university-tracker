'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ParentNote {
  id: string
  note: string
  createdAt: string
  application: {
    id: string
    university: {
      name: string
      city: string
      state?: string
      country: string
    }
  }
}

interface ConnectedChild {
  id: string
  name: string
  email: string
  relationshipType: string
}

export default function ParentNotesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
  
  const [notes, setNotes] = useState<ParentNote[]>([])
  const [connectedChildren, setConnectedChildren] = useState<ConnectedChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user.role === 'parent') {
      fetchConnectedChildren()
    }
  }, [session])

  useEffect(() => {
    if (selectedChildId) {
      fetchNotes()
    }
  }, [selectedChildId])

  const fetchConnectedChildren = async () => {
    try {
      const response = await fetch('/api/parent/children')
      
      if (response.ok) {
        const data = await response.json()
        const children = data.children?.map((link: any) => ({
          id: link.child.id,
          name: link.child.name,
          email: link.child.email,
          relationshipType: link.relationshipType
        })) || []
        
        setConnectedChildren(children)
        
        // If no childId in URL, select first child
        if (!selectedChildId && children.length > 0) {
          setSelectedChildId(children[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching connected children:', error)
    }
  }

  const fetchNotes = async () => {
    if (!selectedChildId) return
    
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/parent/notes?childId=${selectedChildId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notes')
      }

      const data = await response.json()
      setNotes(data.notes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const deleteNote = async (noteId: string) => {
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

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session || session.user.role !== 'parent') {
    return null
  }

  const selectedChild = connectedChildren.find(child => child.id === selectedChildId)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
            <p className="text-gray-600 mt-2">
              {selectedChild ? `Notes about ${selectedChild.name}'s applications` : 'Select a student to view notes'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/parent-dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Link>
            
            {connectedChildren.length > 0 && (
              <div className="flex items-center space-x-2">
                <label htmlFor="child-select" className="text-sm font-medium text-gray-700">
                  Student:
                </label>
                <select
                  id="child-select"
                  value={selectedChildId || ''}
                  onChange={(e) => {
                    setSelectedChildId(e.target.value)
                    router.push(`/parent/notes?childId=${e.target.value}`)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a student</option>
                  {connectedChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {connectedChildren.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Students</h3>
            <p className="text-gray-500 mb-4">
              You need to connect with a student to view and add notes.
            </p>
            <Link
              href="/relationships"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Connect with Student
            </Link>
          </div>
        ) : !selectedChildId ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Student</h3>
            <p className="text-gray-500">
              Choose a student from the dropdown above to view your notes.
            </p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-red-600">Error: {error}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Notes Summary
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {notes.length} note{notes.length !== 1 ? 's' : ''} across {selectedChild?.name}'s applications
                  </p>
                </div>
                <Link
                  href={`/parent/applications?childId=${selectedChildId}`}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  Add New Note
                </Link>
              </div>
            </div>

            {/* Notes List */}
            {notes.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't added any notes about {selectedChild?.name}'s applications yet.
                </p>
                <Link
                  href={`/parent/applications?childId=${selectedChildId}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  View Applications
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {note.application.university.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {note.application.university.city}, {note.application.university.state || note.application.university.country}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <Link
                          href={`/parent/applications/${note.application.id}/notes?childId=${selectedChildId}`}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Add Another Note →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  )
}