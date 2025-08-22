'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          Welcome, {session.user.name} ({session.user.role})
        </span>
        <button
          onClick={() => signOut()}
          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <Link
        href="/auth/signin"
        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
      >
        Sign In
      </Link>
      <Link
        href="/auth/signup"
        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
      >
        Sign Up
      </Link>
    </div>
  )
}