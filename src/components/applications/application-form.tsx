'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateApplicationInput, ApplicationType } from '@/lib/validations/application';

interface University {
  id: string;
  name: string;
  country: string;
  state: string | null;
  city: string;
  deadlines: Record<string, string> | null;
}

interface ApplicationFormProps {
  universities: University[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ApplicationForm({ universities, onSuccess, onCancel }: ApplicationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateApplicationInput>({
    universityId: '',
    applicationType: 'regular',
    deadline: undefined,
    notes: ''
  });
  const [calculatedDeadline, setCalculatedDeadline] = useState<string>('');

  const applicationTypes: { value: ApplicationType; label: string }[] = [
    { value: 'early_decision', label: 'Early Decision' },
    { value: 'early_action', label: 'Early Action' },
    { value: 'regular', label: 'Regular Decision' },
    { value: 'rolling', label: 'Rolling Admission' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create application');
      }

      const application = await response.json();
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/applications/${application.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDeadline = (universityId: string, applicationType: ApplicationType) => {
    const university = universities.find(u => u.id === universityId);
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Default deadlines if university doesn't specify
    const defaultDeadlines: Record<ApplicationType, string> = {
      'early_decision': `${currentYear}-11-01`,
      'early_action': `${currentYear}-11-15`,
      'regular': `${nextYear}-01-15`,
      'rolling': `${nextYear}-05-01`
    };

    let deadlineStr: string;

    if (university?.deadlines && university.deadlines[applicationType]) {
      deadlineStr = university.deadlines[applicationType];
    } else {
      deadlineStr = defaultDeadlines[applicationType];
    }

    const deadline = new Date(deadlineStr);
    
    // If the deadline has passed this year, move to next year
    const now = new Date();
    if (deadline < now && applicationType !== 'rolling') {
      deadline.setFullYear(deadline.getFullYear() + 1);
    }

    return deadline.toISOString().split('T')[0];
  };

  const handleUniversityChange = (universityId: string) => {
    setFormData(prev => ({ ...prev, universityId }));
    
    if (universityId) {
      const calculated = calculateDeadline(universityId, formData.applicationType);
      setCalculatedDeadline(calculated);
      
      // Set as default if no custom deadline is set
      if (!formData.deadline) {
        setFormData(prev => ({ ...prev, deadline: calculated }));
      }
    } else {
      setCalculatedDeadline('');
    }
  };

  const handleApplicationTypeChange = (applicationType: ApplicationType) => {
    setFormData(prev => ({ ...prev, applicationType }));
    
    // Auto-update deadline if university is selected
    if (formData.universityId) {
      const calculated = calculateDeadline(formData.universityId, applicationType);
      setCalculatedDeadline(calculated);
      
      // Update deadline if using calculated value
      if (formData.deadline === calculatedDeadline || !formData.deadline) {
        setFormData(prev => ({ ...prev, deadline: calculated }));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Application</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* University Selection */}
        <div>
          <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-2">
            University *
          </label>
          <select
            id="university"
            value={formData.universityId}
            onChange={(e) => handleUniversityChange(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a university</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name} - {university.city}, {university.state || university.country}
              </option>
            ))}
          </select>
        </div>

        {/* Application Type */}
        <div>
          <label htmlFor="applicationType" className="block text-sm font-medium text-gray-700 mb-2">
            Application Type *
          </label>
          <select
            id="applicationType"
            value={formData.applicationType}
            onChange={(e) => handleApplicationTypeChange(e.target.value as ApplicationType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {applicationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
            Application Deadline
          </label>
          {calculatedDeadline && (
            <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Calculated deadline:</span> {new Date(calculatedDeadline).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can override this with a custom deadline below.
              </p>
            </div>
          )}
          <input
            type="date"
            id="deadline"
            value={formData.deadline || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value || undefined }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={calculatedDeadline ? 'Override calculated deadline' : 'Select deadline'}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to use the calculated deadline based on application type.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any additional notes about this application..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Application'}
          </button>
        </div>
      </form>
    </div>
  );
}