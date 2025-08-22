'use client'

import { ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { AuthStatus } from '@/components/auth/AuthStatus'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
                University Application Tracker
              </Link>
              
              {session && (
                <nav className="flex space-x-6">
                  <Link
                    href={
                      session.user.role === 'admin' ? '/admin' :
                      session.user.role === 'student' ? '/dashboard' : 
                      '/parent-dashboard'
                    }
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Profile
                  </Link>
                  {session.user.role !== 'admin' && (
                    <Link
                      href="/relationships"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {session.user.role === 'parent' ? 'Students' : 'Parents'}
                    </Link>
                  )}
                  {session.user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Admin
                    </Link>
                  )}
                </nav>
              )}
            </div>
            
            <AuthStatus />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}