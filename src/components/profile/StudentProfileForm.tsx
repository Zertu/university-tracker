'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'

const studentProfileSchema = z.object({
  graduationYear: z.number().int().min(2020).max(2030).optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  satScore: z.number().int().min(400).max(1600).optional(),
  actScore: z.number().int().min(1).max(36).optional(),
  targetCountries: z.array(z.string()).default([]),
  intendedMajors: z.array(z.string()).default([]),
})

type StudentProfileData = z.infer<typeof studentProfileSchema>

interface StudentProfile {
  id: string
  userId: string
  graduationYear?: number
  gpa?: number
  satScore?: number
  actScore?: number
  targetCountries: string[]
  intendedMajors: string[]
  createdAt: string
  updatedAt: string
}

const COMMON_COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Switzerland',
  'Sweden',
  'Denmark',
]

const COMMON_MAJORS = [
  'Computer Science',
  'Engineering',
  'Business Administration',
  'Economics',
  'Psychology',
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'English Literature',
  'History',
  'Political Science',
  'International Relations',
  'Medicine',
  'Pre-Med',
  'Pre-Law',
  'Art',
  'Music',
  'Communications',
  'Marketing',
]

export default function StudentProfileForm() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [formData, setFormData] = useState<StudentProfileData>({
    graduationYear: undefined,
    gpa: undefined,
    satScore: undefined,
    actScore: undefined,
    targetCountries: [],
    intendedMajors: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')

  // Form input states
  const [newCountry, setNewCountry] = useState('')
  const [newMajor, setNewMajor] = useState('')

  useEffect(() => {
    fetchStudentProfile()
  }, [])

  const fetchStudentProfile = async () => {
    try {
      const response = await fetch('/api/profile/student')
      if (response.ok) {
        const data = await response.json()
        if (data.studentProfile) {
          const profile = data.studentProfile
          setProfile(profile)
          setFormData({
            graduationYear: profile.graduationYear || undefined,
            gpa: profile.gpa || undefined,
            satScore: profile.satScore || undefined,
            actScore: profile.actScore || undefined,
            targetCountries: profile.targetCountries ? JSON.parse(profile.targetCountries) : [],
            intendedMajors: profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [],
          })
        }
      } else {
        console.error('Failed to fetch student profile')
      }
    } catch (error) {
      console.error('Error fetching student profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setMessage('')
    setSaving(true)

    try {
      // Validate form data
      const validatedData = studentProfileSchema.parse(formData)

      const response = await fetch('/api/profile/student', {
        method: profile ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      })

      const data = await response.json()

      if (response.ok) {
        setProfile(data.studentProfile)
        setMessage('Academic profile updated successfully!')
      } else {
        if (data.details) {
          // Handle validation errors
          const fieldErrors: Record<string, string> = {}
          data.details.forEach((error: { path?: (string | number)[]; message: string }) => {
            if (error.path) {
              fieldErrors[error.path[0]] = error.message
            }
          })
          setErrors(fieldErrors)
        } else {
          setMessage(data.error || 'Failed to update academic profile')
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.issues.forEach((err) => {
          if (err.path && err.path[0] !== undefined) {
            fieldErrors[String(err.path[0])] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setMessage('An unexpected error occurred')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    let parsedValue: string | number | undefined = value

    // Parse numeric fields
    if (['graduationYear', 'satScore', 'actScore'].includes(name)) {
      parsedValue = value ? parseInt(value, 10) : undefined
    } else if (name === 'gpa') {
      parsedValue = value ? parseFloat(value) : undefined
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }))
    }
  }

  const addCountry = () => {
    if (newCountry.trim() && !formData.targetCountries.includes(newCountry.trim())) {
      setFormData(prev => ({
        ...prev,
        targetCountries: [...prev.targetCountries, newCountry.trim()],
      }))
      setNewCountry('')
    }
  }

  const removeCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      targetCountries: prev.targetCountries.filter(c => c !== country),
    }))
  }

  const addMajor = () => {
    if (newMajor.trim() && !formData.intendedMajors.includes(newMajor.trim())) {
      setFormData(prev => ({
        ...prev,
        intendedMajors: [...prev.intendedMajors, newMajor.trim()],
      }))
      setNewMajor('')
    }
  }

  const removeMajor = (major: string) => {
    setFormData(prev => ({
      ...prev,
      intendedMajors: prev.intendedMajors.filter(m => m !== major),
    }))
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-2">
              Graduation Year
            </label>
            <select
              id="graduationYear"
              name="graduationYear"
              value={formData.graduationYear || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.graduationYear ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select graduation year</option>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {errors.graduationYear && (
              <p className="text-sm text-red-600 mt-1">{errors.graduationYear}</p>
            )}
          </div>

          <div>
            <label htmlFor="gpa" className="block text-sm font-medium text-gray-700 mb-2">
              GPA (4.0 scale)
            </label>
            <input
              type="number"
              id="gpa"
              name="gpa"
              value={formData.gpa || ''}
              onChange={handleInputChange}
              min="0"
              max="4.0"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.gpa ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 3.75"
            />
            {errors.gpa && (
              <p className="text-sm text-red-600 mt-1">{errors.gpa}</p>
            )}
          </div>

          <div>
            <label htmlFor="satScore" className="block text-sm font-medium text-gray-700 mb-2">
              SAT Score
            </label>
            <input
              type="number"
              id="satScore"
              name="satScore"
              value={formData.satScore || ''}
              onChange={handleInputChange}
              min="400"
              max="1600"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.satScore ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 1450"
            />
            {errors.satScore && (
              <p className="text-sm text-red-600 mt-1">{errors.satScore}</p>
            )}
          </div>

          <div>
            <label htmlFor="actScore" className="block text-sm font-medium text-gray-700 mb-2">
              ACT Score
            </label>
            <input
              type="number"
              id="actScore"
              name="actScore"
              value={formData.actScore || ''}
              onChange={handleInputChange}
              min="1"
              max="36"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.actScore ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., 32"
            />
            {errors.actScore && (
              <p className="text-sm text-red-600 mt-1">{errors.actScore}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Countries
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.targetCountries.map((country) => (
              <span
                key={country}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {country}
                <button
                  type="button"
                  onClick={() => removeCountry(country)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a country</option>
              {COMMON_COUNTRIES.filter(country => !formData.targetCountries.includes(country)).map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCountry}
              disabled={!newCountry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intended Majors
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.intendedMajors.map((major) => (
              <span
                key={major}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {major}
                <button
                  type="button"
                  onClick={() => removeMajor(major)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={newMajor}
              onChange={(e) => setNewMajor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a major</option>
              {COMMON_MAJORS.filter(major => !formData.intendedMajors.includes(major)).map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addMajor}
              disabled={!newMajor}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}