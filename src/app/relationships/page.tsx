'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'

interface Relationship {
  id: string
  relationshipType: string
  createdAt: string
  parent?: {
    id: string
    email: string
    name: string
    role: string
  }
  child?: {
    id: string
    email: string
    name: string
    role: string
    studentProfile?: {
      graduationYear?: number
      gpa?: number
      satScore?: number
      actScore?: number
    }
  }
}

export default function RelationshipsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    childEmail: '',
    relationshipType: 'parent' as 'parent' | 'guardian'
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated') {
      fetchRelationships()
    }
  }, [status, router])

  const fetchRelationships = async () => {
    try {
      const response = await fetch('/api/relationships')
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships)
      }
    } catch (error) {
      console.error('Failed to fetch relationships:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create relationship')
        return
      }

      setFormData({ childEmail: '', relationshipType: 'parent' })
      setShowAddForm(false)
      await fetchRelationships()
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) {
      return
    }

    try {
      const response = await fetch(`/api/relationships/${relationshipId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRelationships()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete relationship')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    }
  }

  if (loading && relationships.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {session.user.role === 'parent' ? 'Connected Students' : 'Connected Parents'}
              </h1>
              {session.user.role === 'parent' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Connect Student
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {showAddForm && session.user.role === 'parent' && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Connect with Student</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Student Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.childEmail}
                      onChange={(e) => setFormData({ ...formData, childEmail: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter student's email address"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Relationship Type
                    </label>
                    <select
                      value={formData.relationshipType}
                      onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value as 'parent' | 'guardian' })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="parent">Parent</option>
                      <option value="guardian">Guardian</option>
                    </select>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Connect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setError('')
                      }}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {relationships.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {session.user.role === 'parent' 
                    ? 'No students connected yet. Use the "Connect Student" button to link with your child\'s account.'
                    : 'No parents connected yet. Ask your parent to connect with your account using your email address.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {relationships.map((relationship) => (
                  <div key={relationship.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {session.user.role === 'parent' && relationship.child ? (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {relationship.child.name}
                            </h3>
                            <p className="text-sm text-gray-500">{relationship.child.email}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              Relationship: {relationship.relationshipType}
                            </p>
                            {relationship.child.studentProfile && (
                              <div className="mt-2 text-sm text-gray-600">
                                {relationship.child.studentProfile.graduationYear && (
                                  <span className="mr-4">
                                    Graduation: {relationship.child.studentProfile.graduationYear}
                                  </span>
                                )}
                                {relationship.child.studentProfile.gpa && (
                                  <span className="mr-4">
                                    GPA: {relationship.child.studentProfile.gpa}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : relationship.parent ? (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {relationship.parent.name}
                            </h3>
                            <p className="text-sm text-gray-500">{relationship.parent.email}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              Relationship: {relationship.relationshipType}
                            </p>
                          </div>
                        ) : null}
                        
                        <p className="text-xs text-gray-400 mt-2">
                          Connected on {new Date(relationship.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(relationship.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}