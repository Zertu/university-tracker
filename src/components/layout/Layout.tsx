'use client'

import { ReactNode, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthStatus } from '@/components/auth/AuthStatus'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { ToastProvider } from '@/components/ui/toast'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActivePath = (path: string): boolean => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const getLinkClasses = (path: string): string => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    return isActivePath(path)
      ? `${baseClasses} bg-blue-100 text-blue-700`
      : `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-100`
  }

  const getMobileLinkClasses = (path: string): string => {
    const baseClasses = "block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    return isActivePath(path)
      ? `${baseClasses} bg-blue-100 text-blue-700`
      : `${baseClasses} text-gray-600 hover:text-gray-900 hover:bg-gray-100`
  }

  const navigationItems = session ? [
    {
      name: 'Dashboard',
      href: session.user.role === 'admin' ? '/admin' :
            session.user.role === 'student' ? '/dashboard' : 
            '/parent-dashboard',
      show: true
    },
    {
      name: 'Applications',
      href: '/applications',
      show: session.user.role === 'student'
    },
    {
      name: 'Deadlines',
      href: '/deadlines',
      show: session.user.role === 'student'
    },
    {
      name: 'Universities',
      href: '/universities',
      show: session.user.role === 'student'
    },
    {
      name: 'Profile',
      href: '/profile',
      show: true
    },
    {
      name: session.user.role === 'parent' ? 'Students' : 'Parents',
      href: '/relationships',
      show: session.user.role !== 'admin'
    },
    {
      name: 'Admin',
      href: '/admin',
      show: session.user.role === 'admin'
    }
  ].filter(item => item.show) : []

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          {/* Skip to main content link for screen readers */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
          >
            Skip to main content
          </a>

      <header className="bg-white shadow-sm border-b" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Link 
                href="/" 
                className="text-lg sm:text-xl font-semibold text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
                aria-label="University Application Tracker - Home"
              >
                <span className="hidden sm:inline">University Application Tracker</span>
                <span className="sm:hidden">UAT</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {session && (
              <nav className="hidden md:flex space-x-1" role="navigation" aria-label="Main navigation">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={getLinkClasses(item.href)}
                    aria-current={isActivePath(item.href) ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            )}

            {/* Mobile menu button and Auth Status */}
            <div className="flex items-center space-x-2">
              <AuthStatus />
              
              {session && (
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-controls="mobile-menu"
                  aria-expanded={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  {!isMobileMenuOpen ? (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  ) : (
                    <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {session && (
            <div 
              className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
              id="mobile-menu"
            >
              <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={getMobileLinkClasses(item.href)}
                    aria-current={isActivePath(item.href) ? 'page' : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <main 
        id="main-content"
        className="flex-1 focus:outline-none" 
        role="main"
        tabIndex={-1}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Footer for better page structure */}
      <footer className="bg-white border-t border-gray-200 mt-auto" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p className="text-sm text-gray-500">
              © 2024 University Application Tracker. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="/help" 
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Help
              </Link>
              <Link 
                href="/privacy" 
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  )
}