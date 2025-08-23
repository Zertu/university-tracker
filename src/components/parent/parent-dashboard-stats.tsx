'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'

interface DashboardStats {
  totalApplications: number
  submittedApplications: number
  acceptedApplications: number
  rejectedApplications: number
  waitlistedApplications: number
  upcomingDeadlines: number
  estimatedCosts: number
  overallProgress: number
}

interface Child {
  id: string
  name: string
  email: string
  studentProfile?: {
    graduationYear?: number
    gpa?: number
    satScore?: number
    actScore?: number
  }
}

interface ParentDashboardStatsProps {
  childId: string
}

export function ParentDashboardStats({ childId }: ParentDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [child, setChild] = useState<Child | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [childId])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/parent/dashboard/${childId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setStats(data.statistics)
      setChild(data.child)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !stats || !child) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">
          Error: {error || 'Failed to load dashboard data'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Child Info Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{child.name}</h2>
            <p className="text-gray-600">{child.email}</p>
          </div>
          {child.studentProfile && (
            <div className="text-right">
              {child.studentProfile.graduationYear && (
                <p className="text-sm text-gray-500">
                  Class of {child.studentProfile.graduationYear}
                </p>
              )}
              {child.studentProfile.gpa && (
                <p className="text-sm text-gray-500">
                  GPA: {child.studentProfile.gpa.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Applications"
          value={stats.totalApplications}
          subtitle="Universities applied to"
          color="blue"
        />
        
        <StatCard
          title="Submitted"
          value={stats.submittedApplications}
          subtitle="Applications sent"
          color="green"
        />
        
        <StatCard
          title="Upcoming Deadlines"
          value={stats.upcomingDeadlines}
          subtitle="Next 30 days"
          color={stats.upcomingDeadlines > 0 ? "red" : "gray"}
        />
        
        <StatCard
          title="Overall Progress"
          value={`${stats.overallProgress}%`}
          subtitle="Requirements completed"
          color="purple"
        />
      </div>

      {/* Decision Results (if any) */}
      {(stats.acceptedApplications > 0 || stats.rejectedApplications > 0 || stats.waitlistedApplications > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Accepted"
            value={stats.acceptedApplications}
            subtitle="Congratulations!"
            color="green"
          />
          
          <StatCard
            title="Waitlisted"
            value={stats.waitlistedApplications}
            subtitle="Still in consideration"
            color="yellow"
          />
          
          <StatCard
            title="Rejected"
            value={stats.rejectedApplications}
            subtitle="Keep trying!"
            color="red"
          />
        </div>
      )}

      {/* Financial Overview */}
      {stats.estimatedCosts > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Financial Planning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Estimated Costs</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.estimatedCosts)}
              </p>
              <p className="text-xs text-gray-500">
                Annual tuition across all applications
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average per School</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.estimatedCosts / Math.max(stats.totalApplications, 1))}
              </p>
              <p className="text-xs text-gray-500">
                Based on {stats.totalApplications} application{stats.totalApplications !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}