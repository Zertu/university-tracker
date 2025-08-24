import Layout from '@/components/layout/Layout'
import { AuthStatus } from '@/components/auth/AuthStatus'

export default function Home() {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to University Application Tracker
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Manage your college applications, track deadlines, and stay organized throughout your application process.
      </p>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Get Started</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800">📝 Track Applications</h4>
            <p className="text-sm text-blue-600">Manage your college applications</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800">⏰ Monitor Deadlines</h4>
            <p className="text-sm text-blue-600">Stay on top of important dates</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800">📊 View Progress</h4>
            <p className="text-sm text-blue-600">Track your application status</p>
          </div>
        </div>
      </div>
    </div>
  )
}