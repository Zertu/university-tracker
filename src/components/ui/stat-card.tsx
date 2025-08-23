'use client'

interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
}

export function StatCard({ title, value, subtitle, color }: StatCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600'
      case 'green':
        return 'text-green-600'
      case 'red':
        return 'text-red-600'
      case 'yellow':
        return 'text-yellow-600'
      case 'purple':
        return 'text-purple-600'
      case 'gray':
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${getColorClasses(color)} mb-1`}>
        {value}
      </p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}