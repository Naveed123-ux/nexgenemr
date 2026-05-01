/**
 * React hook for handling API errors in components
 * 
 * This hook provides a centralized way to handle errors from Redux actions,
 * display appropriate messages to users, and handle authentication redirects.
 */

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner'; // Assuming you're using sonner for toasts
import { ApiError, errorLogger, LogLevel } from '@/lib/error-handling';

// Error information interface matching Redux state
interface ErrorInfo {
  message: string;
  type: string;
  shouldRedirect?: boolean;
}

/**
 * Hook for handling API errors with user feedback and navigation
 */
export function useErrorHandler() {
  const router = useRouter();

  /**
   * Handle an error with appropriate user feedback and actions
   */
  const handleError = useCallback((error: ErrorInfo | ApiError | null, context?: Record<string, any>) => {
    if (!error) return;

    let errorInfo: ErrorInfo;

    // Convert ApiError to ErrorInfo if needed
    if (error instanceof ApiError) {
      errorInfo = {
        message: error.userMessage,
        type: error.type,
        shouldRedirect: error.type === 'authentication'
      };

      // Log the full error for debugging
      errorLogger.log(error, LogLevel.ERROR, context);
    } else {
      errorInfo = error as ErrorInfo;
    }

    // Display appropriate toast message
    switch (errorInfo.type) {
      case 'validation':
        toast.error(errorInfo.message, {
          description: 'Please check your input and try again.',
          duration: 5000,
        });
        break;

      case 'authentication':
        toast.error(errorInfo.message, {
          description: 'Redirecting to login page...',
          duration: 3000,
        });
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login');
        }, 1000);
        break;

      case 'authorization':
        toast.error(errorInfo.message, {
          description: 'Contact your administrator if you believe this is an error.',
          duration: 5000,
        });
        break;

      case 'not_found':
        toast.error(errorInfo.message, {
          description: 'The requested resource may have been moved or deleted.',
          duration: 4000,
        });
        break;

      case 'conflict':
        toast.error(errorInfo.message, {
          description: 'Please resolve the conflict and try again.',
          duration: 5000,
        });
        break;

      case 'rate_limit':
        toast.warning(errorInfo.message, {
          description: 'Please wait before making more requests.',
          duration: 4000,
        });
        break;

      case 'network':
        toast.error(errorInfo.message, {
          description: 'Check your connection and try again.',
          duration: 4000,
          action: {
            label: 'Retry',
            onClick: () => window.location.reload(),
          },
        });
        break;

      case 'server':
        toast.error(errorInfo.message, {
          description: 'Our team has been notified. Please try again later.',
          duration: 5000,
        });
        break;

      default:
        toast.error(errorInfo.message || 'An unexpected error occurred', {
          description: 'Please try again or contact support if the problem persists.',
          duration: 5000,
        });
    }

    // Handle redirect if needed
    if (errorInfo.shouldRedirect && errorInfo.type === 'authentication') {
      setTimeout(() => {
        router.push('/auth/login');
      }, 1000);
    }
  }, [router]);

  /**
   * Handle success messages
   */
  const handleSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 3000,
    });
  }, []);

  /**
   * Handle info messages
   */
  const handleInfo = useCallback((message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 3000,
    });
  }, []);

  /**
   * Handle warning messages
   */
  const handleWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  }, []);

  return {
    handleError,
    handleSuccess,
    handleInfo,
    handleWarning,
  };
}

/**
 * Hook for handling Redux async action errors
 * Automatically handles errors from Redux thunk actions
 */
export function useAsyncErrorHandler() {
  const { handleError, handleSuccess } = useErrorHandler();

  /**
   * Handle the result of a Redux async thunk
   */
  const handleAsyncResult = useCallback((
    result: any,
    successMessage?: string,
    context?: Record<string, any>
  ) => {
    if (result.type.endsWith('/fulfilled')) {
      if (successMessage) {
        handleSuccess(successMessage);
      }
    } else if (result.type.endsWith('/rejected')) {
      handleError(result.payload, context);
    }
  }, [handleError, handleSuccess]);

  return {
    handleAsyncResult,
    handleError,
    handleSuccess,
  };
}

/**
 * Hook for monitoring specific error states from Redux
 */
export function useErrorMonitor(errors: (ErrorInfo | null)[], dependencies: any[] = []) {
  const { handleError } = useErrorHandler();

  useEffect(() => {
    errors.forEach((error, index) => {
      if (error) {
        handleError(error, { errorIndex: index });
      }
    });
  }, [...errors, ...dependencies, handleError]);
}

/**
 * Hook for handling form validation errors
 */
export function useFormErrorHandler() {
  const { handleError } = useErrorHandler();

  const handleValidationErrors = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      const errorInfo: ErrorInfo = {
        message: errorMessages[0], // Show first error
        type: 'validation'
      };

      if (errorMessages.length > 1) {
        errorInfo.message += ` (and ${errorMessages.length - 1} other error${errorMessages.length > 2 ? 's' : ''})`;
      }

      handleError(errorInfo);
    }
  }, [handleError]);

  return {
    handleValidationErrors,
    handleError,
  };
}

/**
 * Hook for retry functionality with error handling
 */
export function useRetryHandler() {
  const { handleError, handleInfo } = useErrorHandler();

  const handleRetry = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    retryMessage?: string
  ) => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const message = retryMessage || `Retrying... (${attempt}/${maxRetries})`;
          handleInfo(message);

          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    // All retries failed, handle the final error
    handleError(lastError);
    throw lastError;
  }, [handleError, handleInfo]);

  return {
    handleRetry,
  };
}