import toast from 'react-hot-toast';

/**
 * Reusable toast notification utilities
 * 
 * Usage:
 * import { showSuccess, showError, showLoading } from '@/lib/toast';
 * 
 * showSuccess('Operation completed successfully!');
 * showError('Something went wrong');
 * const toastId = showLoading('Processing...');
 * toast.dismiss(toastId); // to dismiss loading toast
 */

export const showSuccess = (message: string) => {
  return toast.success(message);
};

export const showError = (message: string) => {
  return toast.error(message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(promise, messages);
};

// Re-export toast for advanced usage
export { toast };

