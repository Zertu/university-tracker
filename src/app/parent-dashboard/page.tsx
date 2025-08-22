'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

export default function ParentDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && session?.user?.role !== 'parent') {
      router.push('/dashboard')
    }
  }, [status, session, router])

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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {session.user.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connected Students</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-500">Students you&apos;re tracking</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Applications</h3>
            <p className="text-3xl font-bold text-orange-600">0</p>
            <p className="text-sm text-gray-500">Across all students</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Deadlines</h3>
            <p className="text-3xl font-bold text-red-600">0</p>
            <p className="text-sm text-gray-500">Require attention</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              <Link
                href="/relationships"
                className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-medium text-gray-900">Connect with Student</h3>
                <p className="text-sm text-gray-500">Link to your child&apos;s account to track their applications</p>
              </Link>
              
              <div className="block w-full text-left p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-500">View Applications</h3>
                <p className="text-sm text-gray-400">Coming soon - monitor application progress</p>
              </div>
              
              <div className="block w-full text-left p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-500">Add Notes</h3>
                <p className="text-sm text-gray-400">Coming soon - add private notes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Student Activity</h2>
            </div>
            <div className="p-6">
              <div className="text-center text-gray-500 py-8">
                <p>No connected students</p>
                <p className="text-sm">Connect with your child to see their application progress</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}