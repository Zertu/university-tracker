'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { handleApiError, errorToToast, logError, retryOperation } from '@/lib/utils/error-handler';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  retries?: number;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: any;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { addToast } = useToast();

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const operation = options.retries 
        ? () => retryOperation(apiCall, options.retries)
        : apiCall;

      const data = await operation();

      setState({ data, loading: false, error: null });

      // Success handling
      if (options.onSuccess) {
        options.onSuccess(data);
      }

      if (options.showSuccessToast && options.successMessage) {
        addToast({
          type: 'success',
          title: 'Success',
          message: options.successMessage,
        });
      }

      return data;
    } catch (error) {
      const apiError = handleApiError(error);
      logError(error, 'useApi');

      setState(prev => ({ ...prev, loading: false, error: apiError }));

      // Error handling
      if (options.onError) {
        options.onError(apiError);
      }

      if (options.showErrorToast !== false) {
        addToast(errorToToast(apiError));
      }

      throw apiError;
    }
  }, [addToast, options]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for mutations (POST, PUT, DELETE)
export function useMutation<T = any>(options: UseApiOptions = {}) {
  return useApi<T>({
    showErrorToast: true,
    ...options,
  });
}

// Specialized hook for queries (GET)
export function useQuery<T = any>(options: UseApiOptions = {}) {
  return useApi<T>({
    showErrorToast: true,
    retries: 2,
    ...options,
  });
}

// Hook for form submissions with validation error handling
export function useFormSubmission<T = any>(options: UseApiOptions = {}) {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const api = useMutation<T>({
    ...options,
    onError: (error) => {
      // Handle validation errors specially
      if (error.code === 'VALIDATION_ERROR' && error.details) {
        setValidationErrors(error.details);
      } else {
        setValidationErrors({});
      }

      if (options.onError) {
        options.onError(error);
      }
    },
    onSuccess: (data) => {
      setValidationErrors({});
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
  });

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    ...api,
    validationErrors,
    clearValidationErrors,
  };
}

// Hook for optimistic updates
export function useOptimisticMutation<T = any>(
  optimisticUpdate: (data: any) => void,
  rollback: () => void,
  options: UseApiOptions = {}
) {
  const api = useMutation<T>({
    ...options,
    onError: (error) => {
      rollback();
      if (options.onError) {
        options.onError(error);
      }
    },
  });

  const executeOptimistic = useCallback(async (
    apiCall: () => Promise<T>,
    optimisticData: any
  ) => {
    // Apply optimistic update immediately
    optimisticUpdate(optimisticData);

    try {
      return await api.execute(apiCall);
    } catch (error) {
      // Rollback is handled in onError
      throw error;
    }
  }, [api, optimisticUpdate]);

  return {
    ...api,
    execute: executeOptimistic,
  };
}
