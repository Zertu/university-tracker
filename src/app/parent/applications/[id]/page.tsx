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
  submittedDate?: string
  decisionDate?: string
  decisionType?: string
  notes?: string
  applicationType: string
  university: {
    id: string
    name: string
    country: string
    state?: string
    city: string
    usNewsRanking?: number
    acceptanceRate?: number
    applicationSystem: string
    tuitionInState?: number
    tuitionOutState?: number
    applicationFee?: number
    websiteUrl?: string
  }
  requirements: Array<{
    id: string
    requirementType: string
    title: string
    status: string
    deadline?: string
  }>
  parentNotes: Array<{
    id: string
    note: string
    createdAt: string
  }>
}

export default function ParentApplicationDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const childId = searchParams.get('childId')
  const applicationId = params.id
  
  const [application, setApplication] = useState<Application | null>(null)
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
    if (session?.user.role === 'parent' && applicationId && childId) {
      fetchApplication()
    }
  }, [session, applicationId, childId])

  const fetchApplication = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/applications/${applicationId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch application details')
      }

      const data = await response.json()
      setApplication(data.application)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
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

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-red-600">Error: {error}</div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!application) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Application Not Found</h3>
            <p className="text-gray-500">
              The requested application could not be found.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

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

  const formatApplicationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const deadline = new Date(application.deadline)
  const isUrgent = deadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const tuition = application.university.tuitionOutState || application.university.tuitionInState

  const completedRequirements = application.requirements.filter(req => req.status === 'completed').length
  const totalRequirements = application.requirements.length
  const progress = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
            <p className="text-gray-600 mt-2">
              Read-only view of application progress
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href={`/parent/applications?childId=${childId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back to Applications
            </Link>
            <Link
              href={`/parent/applications/${applicationId}/notes?childId=${childId}`}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Note
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Application Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* University Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {application.university.name}
                    </h2>
                    <p className="text-gray-600">
                      {application.university.city}, {application.university.state || application.university.country}
                    </p>
                  </div>
                  <div className="text-right">
                    {application.university.usNewsRanking && (
                      <p className="text-sm text-gray-500">
                        US News Ranking: #{application.university.usNewsRanking}
                      </p>
                    )}
                    {application.university.acceptanceRate && (
                      <p className="text-sm text-gray-500">
                        Acceptance Rate: {(application.university.acceptanceRate * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Application System</h3>
                    <p className="text-lg text-gray-900">{application.university.applicationSystem}</p>
                  </div>
                  
                  {application.university.websiteUrl && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Website</h3>
                      <a
                        href={application.university.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg text-blue-600 hover:text-blue-800"
                      >
                        Visit Website →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Application Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Application Status</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Current Status</h4>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(application.status)}`}>
                      {formatStatus(application.status)}
                    </span>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Application Type</h4>
                    <p className="text-lg text-gray-900">{formatApplicationType(application.applicationType)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Deadline</h4>
                    <p className={`text-lg font-medium ${isUrgent ? 'text-red-600' : 'text-gray-900'}`}>
                      {deadline.toLocaleDateString()}
                      {isUrgent && <span className="ml-2 text-sm">(Urgent)</span>}
                    </p>
                  </div>
                  
                  {application.submittedDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Submitted</h4>
                      <p className="text-lg text-gray-900">
                        {new Date(application.submittedDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {application.decisionType && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Decision</h4>
                      <p className={`text-lg font-medium ${getDecisionColor(application.decisionType)}`}>
                        {formatDecision(application.decisionType)}
                      </p>
                    </div>
                  )}
                  
                  {application.decisionDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Decision Date</h4>
                      <p className="text-lg text-gray-900">
                        {new Date(application.decisionDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
                  <div className="text-sm text-gray-500">
                    {completedRequirements}/{totalRequirements} completed ({progress}%)
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {application.requirements.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No requirements defined</p>
                ) : (
                  <div className="space-y-4">
                    {application.requirements.map((requirement) => (
                      <div key={requirement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{requirement.title}</h4>
                          <p className="text-sm text-gray-500 capitalize">
                            {requirement.requirementType.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          {requirement.deadline && (
                            <div className="text-sm text-gray-500">
                              Due: {new Date(requirement.deadline).toLocaleDateString()}
                            </div>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(requirement.status)}`}>
                            {formatStatus(requirement.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Information */}
            {(tuition || application.university.applicationFee) && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>
                </div>
                <div className="p-6 space-y-4">
                  {tuition && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Annual Tuition</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(tuition)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {application.university.tuitionOutState ? 'Out-of-state' : 'In-state'} rate
                      </p>
                    </div>
                  )}
                  
                  {application.university.applicationFee && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Application Fee</h4>
                      <p className="text-lg font-medium text-gray-900">
                        {formatCurrency(application.university.applicationFee)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parent Notes */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">My Notes</h3>
                  <Link
                    href={`/parent/applications/${applicationId}/notes?childId=${childId}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Add Note
                  </Link>
                </div>
              </div>
              <div className="p-6">
                {application.parentNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {application.parentNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-700 line-clamp-3">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {application.parentNotes.length > 3 && (
                      <Link
                        href={`/parent/applications/${applicationId}/notes?childId=${childId}`}
                        className="block text-center text-sm text-blue-600 hover:text-blue-800 py-2"
                      >
                        View all {application.parentNotes.length} notes →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Student Notes (if any) */}
            {application.notes && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Student Notes</h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{application.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}