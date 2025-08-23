'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Application {
  id: string
  status: string
  deadline: string
  decisionType?: string
  progress: number
  totalRequirements: number
  completedRequirements: number
  university: {
    id: string
    name: string
    country: string
    state?: string
    city: string
    tuitionInState?: number
    tuitionOutState?: number
    applicationFee?: number
  }
  parentNotes: Array<{
    id: string
    note: string
    createdAt: string
  }>
}

interface ConnectedChild {
  id: string
  name: string
  email: string
  relationshipType: string
}

export default function ParentApplicationsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
  
  const [applications, setApplications] = useState<Application[]>([])
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
      fetchApplications()
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

  const fetchApplications = async () => {
    if (!selectedChildId) return
    
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`/api/parent/applications/${selectedChildId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications')
      }

      const data = await response.json()
      setApplications(data.applications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
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

  const selectedChild = connectedChildren.find(child => child.id === selectedChildId)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-600 mt-2">
              {selectedChild ? `Monitoring ${selectedChild.name}'s applications` : 'Select a student to view applications'}
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
                    router.push(`/parent/applications?childId=${e.target.value}`)
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
              You need to connect with a student to view their applications.
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
              Choose a student from the dropdown above to view their applications.
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
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-500">
              {selectedChild?.name} hasn't started any applications yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
                <div className="text-sm text-gray-500">Total Applications</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-green-600">
                  {applications.filter(app => app.status === 'submitted' || app.status === 'under_review' || app.status === 'decided').length}
                </div>
                <div className="text-sm text-gray-500">Submitted</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {applications.filter(app => app.decisionType === 'accepted').length}
                </div>
                <div className="text-sm text-gray-500">Accepted</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(applications.reduce((total, app) => {
                    const tuition = app.university.tuitionOutState || app.university.tuitionInState || 0
                    return total + tuition
                  }, 0) / Math.max(applications.length, 1))}
                </div>
                <div className="text-sm text-gray-500">Avg. Tuition</div>
              </div>
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedChild?.name}'s Applications
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {applications.map((application) => (
                  <ApplicationRow 
                    key={application.id} 
                    application={application}
                    childId={selectedChildId}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

interface ApplicationRowProps {
  application: Application
  childId: string
}

function ApplicationRow({ application, childId }: ApplicationRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'bg-gray-100 text-gray-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'submitted': return 'bg-green-100 text-green-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'decided': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDecisionColor = (decisionType?: string) => {
    switch (decisionType) {
      case 'accepted': return 'text-green-600'
      case 'rejected': return 'text-red-600'
      case 'waitlisted': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDecision = (decisionType?: string) => {
    if (!decisionType) return null
    return decisionType.charAt(0).toUpperCase() + decisionType.slice(1)
  }

  const deadline = new Date(application.deadline)
  const isUrgent = deadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const tuition = application.university.tuitionOutState || application.university.tuitionInState

  return (
    <div className="p-6 hover:bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {application.university.name}
          </h3>
          <p className="text-sm text-gray-500">
            {application.university.city}, {application.university.state || application.university.country}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
            {formatStatus(application.status)}
          </span>
          {application.decisionType && (
            <span className={`text-sm font-medium ${getDecisionColor(application.decisionType)}`}>
              {formatDecision(application.decisionType)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Deadline</p>
          <p className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
            {deadline.toLocaleDateString()}
            {isUrgent && <span className="ml-1 text-xs">(Urgent)</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Progress</p>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${application.progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-600">{application.progress}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Requirements</p>
          <p className="text-sm font-medium text-gray-900">
            {application.completedRequirements}/{application.totalRequirements} completed
          </p>
        </div>
        {tuition && (
          <div>
            <p className="text-xs text-gray-500">Estimated Tuition</p>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(tuition)}/year
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {application.parentNotes.length > 0 && (
            <div className="text-xs text-gray-500">
              {application.parentNotes.length} note{application.parentNotes.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href={`/parent/applications/${application.id}/notes?childId=${childId}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Add Note
          </Link>
          <Link
            href={`/parent/applications/${application.id}?childId=${childId}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>

      {application.parentNotes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Latest note:</p>
          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
            {application.parentNotes[0].note}
          </p>
        </div>
      )}
    </div>
  )
}