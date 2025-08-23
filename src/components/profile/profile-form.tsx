'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { CreateStudentProfileSchema } from '@/lib/validations/profile';

interface ProfileFormProps {
  initialData?: any;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

type ProfileFormData = z.infer<typeof CreateStudentProfileSchema>;

const COUNTRIES = [
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
  'Norway',
  'Japan',
  'South Korea',
  'Singapore',
  'New Zealand',
];

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
  'Philosophy',
  'Sociology',
];

export default function ProfileForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isEditing = false 
}: ProfileFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    graduationYear: initialData?.graduationYear || undefined,
    gpa: initialData?.gpa || undefined,
    satScore: initialData?.satScore || undefined,
    actScore: initialData?.actScore || undefined,
    targetCountries: initialData?.targetCountries || [],
    intendedMajors: initialData?.intendedMajors || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [newMajor, setNewMajor] = useState('');

  // Generate graduation year options
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 11 }, (_, i) => currentYear + i - 1);

  const validateForm = (): boolean => {
    try {
      CreateStudentProfileSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          newErrors[path] = issue.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default API call
        const url = '/api/profile';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save profile');
        }

        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ 
        submit: error instanceof Error ? error.message : 'Failed to save profile' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCountry = () => {
    if (newCountry && !formData.targetCountries?.includes(newCountry)) {
      setFormData(prev => ({
        ...prev,
        targetCountries: [...(prev.targetCountries || []), newCountry],
      }));
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setFormData(prev => ({
      ...prev,
      targetCountries: prev.targetCountries?.filter(c => c !== country) || [],
    }));
  };

  const addMajor = () => {
    if (newMajor && !formData.intendedMajors?.includes(newMajor)) {
      setFormData(prev => ({
        ...prev,
        intendedMajors: [...(prev.intendedMajors || []), newMajor],
      }));
      setNewMajor('');
    }
  };

  const removeMajor = (major: string) => {
    setFormData(prev => ({
      ...prev,
      intendedMajors: prev.intendedMajors?.filter(m => m !== major) || [],
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Academic Profile' : 'Create Academic Profile'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Graduation Year */}
        <div>
          <label htmlFor="graduationYear" className="block text-sm font-medium text-gray-700 mb-2">
            Expected Graduation Year
          </label>
          <select
            id="graduationYear"
            value={formData.graduationYear || ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              graduationYear: e.target.value ? parseInt(e.target.value) : undefined,
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select graduation year</option>
            {graduationYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {errors.graduationYear && (
            <p className="mt-1 text-sm text-red-600">{errors.graduationYear}</p>
          )}
        </div>

        {/* Academic Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="gpa" className="block text-sm font-medium text-gray-700 mb-2">
              GPA (4.0 scale)
            </label>
            <input
              type="number"
              id="gpa"
              min="0"
              max="4"
              step="0.01"
              value={formData.gpa || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                gpa: e.target.value ? parseFloat(e.target.value) : undefined,
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="3.75"
            />
            {errors.gpa && (
              <p className="mt-1 text-sm text-red-600">{errors.gpa}</p>
            )}
          </div>

          <div>
            <label htmlFor="satScore" className="block text-sm font-medium text-gray-700 mb-2">
              SAT Score
            </label>
            <input
              type="number"
              id="satScore"
              min="400"
              max="1600"
              value={formData.satScore || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                satScore: e.target.value ? parseInt(e.target.value) : undefined,
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1450"
            />
            {errors.satScore && (
              <p className="mt-1 text-sm text-red-600">{errors.satScore}</p>
            )}
          </div>

          <div>
            <label htmlFor="actScore" className="block text-sm font-medium text-gray-700 mb-2">
              ACT Score
            </label>
            <input
              type="number"
              id="actScore"
              min="1"
              max="36"
              value={formData.actScore || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                actScore: e.target.value ? parseInt(e.target.value) : undefined,
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="32"
            />
            {errors.actScore && (
              <p className="mt-1 text-sm text-red-600">{errors.actScore}</p>
            )}
          </div>
        </div>

        {/* Target Countries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Countries
          </label>
          <div className="flex gap-2 mb-2">
            <select
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a country</option>
              {COUNTRIES.filter(country => !formData.targetCountries?.includes(country)).map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCountry}
              disabled={!newCountry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.targetCountries?.map(country => (
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
          {errors.targetCountries && (
            <p className="mt-1 text-sm text-red-600">{errors.targetCountries}</p>
          )}
        </div>

        {/* Intended Majors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Intended Majors
          </label>
          <div className="flex gap-2 mb-2">
            <select
              value={newMajor}
              onChange={(e) => setNewMajor(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a major</option>
              {COMMON_MAJORS.filter(major => !formData.intendedMajors?.includes(major)).map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addMajor}
              disabled={!newMajor}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.intendedMajors?.map(major => (
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
          {errors.intendedMajors && (
            <p className="mt-1 text-sm text-red-600">{errors.intendedMajors}</p>
          )}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Profile' : 'Create Profile')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}