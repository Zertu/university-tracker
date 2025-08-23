'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'
import { ParentDashboardStats } from '@/components/parent/parent-dashboard-stats'
import { ParentApplicationOverview } from '@/components/parent/parent-application-overview'

interface ConnectedChild {
  id: string
  name: string
  email: string
  relationshipType: string
}

export default function ParentDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [connectedChildren, setConnectedChildren] = useState<ConnectedChild[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  const fetchConnectedChildren = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/parent/children')
      
      if (response.ok) {
        const data = await response.json()
        // Transform the response to match our interface
        const children = data.children?.map((link: any) => ({
          id: link.child.id,
          name: link.child.name,
          email: link.child.email,
          relationshipType: link.relationshipType
        })) || []
        
        setConnectedChildren(children)
        
        // Auto-select first child if available
        if (children.length > 0) {
          setSelectedChildId(children[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching connected children:', error)
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

  const selectedChild = connectedChildren.find(child => child.id === selectedChildId)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {session.user.name}!</p>
          </div>
          
          {connectedChildren.length > 0 && (
            <div className="flex items-center space-x-4">
              <label htmlFor="child-select" className="text-sm font-medium text-gray-700">
                Viewing:
              </label>
              <select
                id="child-select"
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {connectedChildren.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {connectedChildren.length === 0 ? (
          // No connected children - show getting started
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Get Started</h2>
              </div>
              <div className="p-6 space-y-4">
                <Link
                  href="/relationships"
                  className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Connect with Student</h3>
                  <p className="text-sm text-gray-500">Link to your child&apos;s account to track their applications</p>
                </Link>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Click "Connect with Student" above</li>
                    <li>2. Enter your child&apos;s email address</li>
                    <li>3. They&apos;ll receive a connection request</li>
                    <li>4. Once accepted, you can monitor their applications</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Features Available</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Application Monitoring</h4>
                      <p className="text-sm text-gray-500">Track application status and deadlines</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Financial Planning</h4>
                      <p className="text-sm text-gray-500">View tuition costs and estimated expenses</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Private Notes</h4>
                      <p className="text-sm text-gray-500">Add personal notes about applications</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : selectedChild ? (
          // Connected children - show dashboard with data
          <div className="space-y-8">
            {/* Dashboard Statistics */}
            <ParentDashboardStats childId={selectedChild.id} />
            
            {/* Application Overview */}
            <ParentApplicationOverview 
              childId={selectedChild.id} 
              childName={selectedChild.name}
            />
            
            {/* Quick Actions */}
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
                    <h3 className="font-medium text-gray-900">Manage Connections</h3>
                    <p className="text-sm text-gray-500">Add or remove student connections</p>
                  </Link>
                  
                  <Link
                    href={`/parent/applications?childId=${selectedChild.id}`}
                    className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">View All Applications</h3>
                    <p className="text-sm text-gray-500">See detailed application list and status</p>
                  </Link>
                  
                  <Link
                    href={`/parent/notes?childId=${selectedChild.id}`}
                    className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900">Manage Notes</h3>
                    <p className="text-sm text-gray-500">View and organize your private notes</p>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Financial Overview</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Cost Planning Tips</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Compare in-state vs out-of-state tuition</li>
                        <li>• Factor in room, board, and living expenses</li>
                        <li>• Research scholarship and financial aid options</li>
                        <li>• Consider application fees in your budget</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  )
}