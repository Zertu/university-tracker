'use client'

import { useState, useEffect } from 'react'
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

interface ParentApplicationOverviewProps {
  childId: string
  childName: string
}

export function ParentApplicationOverview({ childId, childName }: ParentApplicationOverviewProps) {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [childId])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/parent/applications/${childId}`)
      
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {childName}&apos;s Applications
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {applications.length} application{applications.length !== 1 ? 's' : ''} in progress
        </p>
      </div>
      
      <div className="p-6">
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No applications yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {childName} hasn&apos;t started any applications
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard 
                key={application.id} 
                application={application}
                childId={childId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}interface A
pplicationCardProps {
  application: Application
  childId: string
}

function ApplicationCard({ application, childId }: ApplicationCardProps) {
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
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {application.university.name}
          </h3>
          <p className="text-sm text-gray-500">
            {application.university.city}, {application.university.state || application.university.country}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(application.status)}`}>
            {formatStatus(application.status)}
          </span>
          {application.decisionType && (
            <span className={`text-sm font-medium ${getDecisionColor(application.decisionType)}`}>
              {formatDecision(application.decisionType)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
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
      </div>

      {tuition && (
        <div className="mb-3">
          <p className="text-xs text-gray-500">Estimated Tuition</p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(tuition)}/year
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {application.completedRequirements}/{application.totalRequirements} requirements completed
        </div>
        <Link
          href={`/parent/applications/${application.id}?childId=${childId}`}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Details →
        </Link>
      </div>

      {application.parentNotes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Your latest note:</p>
          <p className="text-sm text-gray-700 truncate">
            {application.parentNotes[0].note}
          </p>
        </div>
      )}
    </div>
  )
}