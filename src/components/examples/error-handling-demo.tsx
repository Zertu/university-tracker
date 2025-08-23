'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { useToast, useSuccessToast, useErrorToast, useWarningToast, useInfoToast } from '@/components/ui/toast';
import { LoadingButton, LoadingSpinner, LoadingOverlay, SkeletonCard } from '@/components/ui/loading';
import { useFormSubmission, useMutation, useQuery } from '@/hooks/use-api';

// Demo component showing all error handling features
export function ErrorHandlingDemo() {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Toast hooks
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const warningToast = useWarningToast();
  const infoToast = useInfoToast();

  // API hooks
  const { data, loading, error, execute } = useQuery({
    showSuccessToast: true,
    successMessage: 'Data loaded successfully!',
  });

  const { execute: submitForm, loading: submitting, validationErrors } = useFormSubmission({
    showSuccessToast: true,
    successMessage: 'Form submitted successfully!',
  });

  const { execute: deleteItem, loading: deleting } = useMutation({
    showSuccessToast: true,
    successMessage: 'Item deleted successfully!',
  });

  // Demo functions
  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        successToast('Success!', 'This is a success message');
        break;
      case 'error':
        errorToast('Error!', 'This is an error message');
        break;
      case 'warning':
        warningToast('Warning!', 'This is a warning message');
        break;
      case 'info':
        infoToast('Info!', 'This is an info message');
        break;
    }
  };

  const handleApiCall = async (shouldFail: boolean = false) => {
    await execute(async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (shouldFail) {
        throw new Error('Simulated API error');
      }
      
      return { message: 'API call successful', data: [1, 2, 3] };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await submitForm(async () => {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate validation error
      if (!formData.name) {
        throw {
          code: 'VALIDATION_ERROR',
          details: { name: 'Name is required' }
        };
      }
      
      if (!formData.email.includes('@')) {
        throw {
          code: 'VALIDATION_ERROR',
          details: { email: 'Invalid email format' }
        };
      }
      
      return { success: true };
    });
  };

  const handleDelete = async () => {
    await deleteItem(async () => {
      // Simulate delete operation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { deleted: true };
    });
  };

  const ThrowErrorComponent = () => {
    throw new Error('This is a test error for the error boundary');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Error Handling Demo</h1>
      
      {/* Toast Notifications */}
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Toast Notifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleToastDemo('success')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Success Toast
          </button>
          <button
            onClick={() => handleToastDemo('error')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Error Toast
          </button>
          <button
            onClick={() => handleToastDemo('warning')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Warning Toast
          </button>
          <button
            onClick={() => handleToastDemo('info')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Info Toast
          </button>
        </div>
      </section>

      {/* Loading States */}
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
            <span className="text-gray-600">Loading spinners</span>
          </div>
          
          <div className="flex space-x-4">
            <LoadingButton
              loading={loading}
              onClick={() => handleApiCall()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              API Call
            </LoadingButton>
            
            <LoadingButton
              loading={submitting}
              onClick={() => {}}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Submit Form
            </LoadingButton>
            
            <LoadingButton
              loading={deleting}
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Item
            </LoadingButton>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Toggle Skeleton
            </button>
            
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Toggle Overlay
            </button>
          </div>

          {showSkeleton && (
            <div className="mt-4">
              <SkeletonCard />
            </div>
          )}

          <LoadingOverlay loading={showOverlay} message="Processing...">
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <p>This content is behind a loading overlay</p>
            </div>
          </LoadingOverlay>
        </div>
      </section>

      {/* API Integration */}
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">API Integration</h2>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <button
              onClick={() => handleApiCall(false)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Successful API Call
            </button>
            
            <button
              onClick={() => handleApiCall(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Failed API Call
            </button>
          </div>

          {data && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">API Response: {JSON.stringify(data)}</p>
            </div>
          )}
        </div>
      </section>

      {/* Form with Validation */}
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Form with Validation</h2>
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <LoadingButton
            type="submit"
            loading={submitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            Submit Form
          </LoadingButton>
        </form>
      </section>

      {/* Error Boundary Demo */}
      <section className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Error Boundary</h2>
        <p className="text-gray-600 mb-4">
          Click the button below to trigger an error that will be caught by the error boundary.
        </p>
        
        <ErrorBoundary
          fallback={
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">Custom error fallback: Something went wrong in this section!</p>
            </div>
          }
        >
          <ErrorBoundaryDemo />
        </ErrorBoundary>
      </section>
    </div>
  );
}

function ErrorBoundaryDemo() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('This is a test error for the error boundary');
  }

  return (
    <div>
      <p className="text-gray-600 mb-4">This component is wrapped in an error boundary.</p>
      <button
        onClick={() => setShouldError(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}