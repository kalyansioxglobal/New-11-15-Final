import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from './ui/Skeleton';

interface MissedCheckResponse {
  userId: number;
  consecutiveMissed: number;
  consecutiveMissedDates: string[];
  threshold: number;
  requiresExplanation: boolean;
  hasExplanation: boolean;
  explanation: string | null;
}

interface Props {
  ventureId?: number;
  onExplanationRequired?: (data: MissedCheckResponse) => void;
  onExplanationProvided?: () => void;
}

export default function MissedEodAlert({ ventureId, onExplanationRequired, onExplanationProvided }: Props) {
  const [data, setData] = useState<MissedCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousVentureIdRef = useRef<number | undefined>(ventureId);
  
  // Use refs to store callbacks so they don't trigger re-fetches
  const onExplanationRequiredRef = useRef(onExplanationRequired);
  const onExplanationProvidedRef = useRef(onExplanationProvided);
  
  // Update refs when callbacks change
  useEffect(() => {
    onExplanationRequiredRef.current = onExplanationRequired;
    onExplanationProvidedRef.current = onExplanationProvided;
  }, [onExplanationRequired, onExplanationProvided]);

  const fetchMissedStatus = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const url = ventureId 
        ? `/api/eod-reports/missed-check?ventureId=${ventureId}`
        : '/api/eod-reports/missed-check';
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        // Call onExplanationRequired if explanation is needed
        if (onExplanationRequiredRef.current && result.requiresExplanation && !result.hasExplanation) {
          onExplanationRequiredRef.current(result);
        }
        // Call onExplanationProvided if no explanation is needed (clears the flag)
        if (onExplanationProvidedRef.current && (!result.requiresExplanation || result.hasExplanation)) {
          onExplanationProvidedRef.current();
        }
      }
    } catch (err) {
      console.error('Failed to check missed EOD reports:', err);
      // On error, clear the requirement flag
      if (onExplanationProvidedRef.current) {
        onExplanationProvidedRef.current();
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [ventureId]);

  useEffect(() => {
    // Only show loading when venture changes or on initial load
    const ventureChanged = previousVentureIdRef.current !== ventureId;
    const isInitialLoad = !data;
    
    previousVentureIdRef.current = ventureId;
    
    // Only show loading skeleton on initial load or when venture changes
    fetchMissedStatus(isInitialLoad || ventureChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventureId]); // Only re-fetch when ventureId changes

  const handleSubmitExplanation = async () => {
    if (!ventureId || explanation.trim().length < 10) {
      setError('Please provide an explanation (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/eod-reports/missed-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ventureId,
          explanation: explanation.trim() 
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.ok ? 'Invalid server response' : `Server error: ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to submit explanation');
      }

      const result = data;
      
      if (result.explanation?.id) {
        await fetch('/api/eod-reports/notify-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ explanationId: result.explanation.id }),
        });
      }

      setShowModal(false);
      setExplanation('');
      // Refresh status after submitting explanation
      const url = ventureId 
        ? `/api/eod-reports/missed-check?ventureId=${ventureId}`
        : '/api/eod-reports/missed-check';
      fetch(url)
        .then((res) => res.json())
        .then((result) => {
          setData(result);
          if (onExplanationProvidedRef.current) {
            onExplanationProvidedRef.current();
          }
        })
        .catch((err) => console.error('Failed to refresh status:', err));
      onExplanationProvidedRef.current?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) return <Skeleton className="w-full h-10" />;

  if (!data.requiresExplanation || data.hasExplanation) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-l-4 border-amber-500 dark:border-amber-400 rounded-lg p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="p-2 bg-amber-200 dark:bg-amber-900/40 rounded-lg">
              <svg className="h-6 w-6 text-amber-700 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-amber-900 dark:text-amber-200 mb-2">
              Missing EOD Reports
            </h3>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="mb-2">
                You have missed <span className="font-semibold">{data.consecutiveMissed}</span> consecutive EOD report{data.consecutiveMissed > 1 ? 's' : ''}. 
                Please provide an explanation before submitting today&apos;s report.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 mb-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Missed dates:</span>
                <span>{data.consecutiveMissedDates.join(', ')}</span>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 dark:bg-amber-700 text-white rounded-lg hover:bg-amber-700 dark:hover:bg-amber-600 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Provide Explanation
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50" onClick={() => {
          setShowModal(false);
          setExplanation('');
          setError(null);
        }}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                  Explain Missing EOD Reports
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  Provide a reason for the missed reports
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setExplanation('');
                  setError(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {data.consecutiveMissed} consecutive day{data.consecutiveMissed > 1 ? 's' : ''} missed
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Dates:</span>
                <span>{data.consecutiveMissedDates.join(', ')}</span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                Why did you miss these EOD reports? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={5}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-4 text-sm text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                placeholder="Please explain why you were unable to submit your EOD reports on these days..."
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Minimum 10 characters required. Your manager will be notified.
                </p>
                <p className={`text-xs font-medium ${
                  explanation.trim().length < 10 
                    ? 'text-gray-400 dark:text-slate-500' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {explanation.trim().length}/10
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowModal(false);
                  setExplanation('');
                  setError(null);
                }}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExplanation}
                disabled={submitting || explanation.trim().length < 10}
                className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Explanation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
