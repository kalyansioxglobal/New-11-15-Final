import React, { useState, useEffect, useCallback } from 'react';

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

  const fetchMissedStatus = useCallback(async () => {
    try {
      const url = ventureId 
        ? `/api/eod-reports/missed-check?ventureId=${ventureId}`
        : '/api/eod-reports/missed-check';
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (onExplanationRequired && result.requiresExplanation && !result.hasExplanation) {
          onExplanationRequired(result);
        }
      }
    } catch (err) {
      console.error('Failed to check missed EOD reports:', err);
    } finally {
      setLoading(false);
    }
  }, [ventureId, onExplanationRequired]);

  useEffect(() => {
    fetchMissedStatus();
  }, [fetchMissedStatus]);

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
      fetchMissedStatus();
      onExplanationProvided?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) return null;

  if (!data.requiresExplanation || data.hasExplanation) return null;

  return (
    <>
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-amber-800">
              Missing EOD Reports
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                You have missed {data.consecutiveMissed} consecutive EOD report(s). 
                Please provide an explanation before submitting today&apos;s report.
              </p>
              <p className="mt-1 text-xs">
                Missed dates: {data.consecutiveMissedDates.join(', ')}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-3 inline-flex items-center px-3 py-1.5 border border-amber-600 text-amber-700 rounded-md hover:bg-amber-100 text-sm font-medium"
              >
                Provide Explanation
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Explain Missing EOD Reports
            </h3>
            
            <div className="mb-4 p-3 bg-amber-50 rounded">
              <p className="font-medium text-gray-900">
                {data.consecutiveMissed} consecutive days missed
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Dates: {data.consecutiveMissedDates.join(', ')}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why did you miss these EOD reports? *
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Please explain why you were unable to submit your EOD reports on these days..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters required. Your manager will be notified.
              </p>
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-4">{error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setExplanation('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExplanation}
                disabled={submitting || explanation.trim().length < 10}
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Explanation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
