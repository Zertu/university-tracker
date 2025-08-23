'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { ApplicationOverview } from '@/components/dashboard/application-overview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ProgressIndicators } from '@/components/dashboard/progress-indicators'
import { DeadlineCalendarWidget } from '@/components/dashboard/deadline-calendar-widget'
import { RecentStatusChanges } from '@/components/applications/recent-status-changes'
import { DeadlineSummaryWidget } from '@/components/deadlines/deadline-summary'
import RecommendationsWidget from '@/components/recommendations/recommendations-widget'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session.user.role !== 'student') {
      router.push('/parent-dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!session || session.user.role !== 'student') {
    return null
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Welcome back, {session.user.name}!</p>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6 sm:space-y-8">
          {/* Application Overview - Full Width */}
          <ApplicationOverview />

          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
            {/* Quick Actions - Always first on mobile */}
            <div className="order-1 lg:order-1 xl:order-1">
              <QuickActions />
            </div>

            {/* Progress Indicators - Second on mobile, first on tablet */}
            <div className="order-2 lg:order-1 xl:order-2">
              <ProgressIndicators limit={5} />
            </div>

            {/* Deadline Summary - Third on mobile, spans full width on tablet */}
            <div className="order-3 lg:col-span-2 xl:col-span-1 xl:order-3">
              <DeadlineSummaryWidget showNextDeadline={true} />
            </div>

            {/* Recommendations Widget - Fourth on mobile */}
            <div className="order-4 lg:order-2 xl:order-4">
              <RecommendationsWidget limit={3} />
            </div>

            {/* Recent Activity - Fifth on mobile, second column on tablet */}
            <div className="order-5 lg:order-3 xl:order-5">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Activity</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <RecentStatusChanges limit={5} />
                </div>
              </div>
            </div>

            {/* Calendar Widget - Last on mobile, spans remaining space */}
            <div className="order-6 lg:order-4 lg:col-span-2 xl:col-span-3 xl:order-6">
              <DeadlineCalendarWidget />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}