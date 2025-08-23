import Layout from '@/components/layout/Layout'
import { AuthStatus } from '@/components/auth/AuthStatus'

export default function Home() {
  return (
    <Layout>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to University Application Tracker
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Manage your college applications, track deadlines, and stay organized throughout your application process.
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Authentication System Ready</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">✓ NextAuth.js Setup</h4>
              <p className="text-sm text-green-600">Email/password authentication configured</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">✓ User Registration</h4>
              <p className="text-sm text-green-600">API routes for user creation</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800">✓ JWT Sessions</h4>
              <p className="text-sm text-green-600">Token handling and persistence</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}