import React, { useState, useEffect, useCallback } from 'react';

interface OverdueTask {
  id: number;
  title: string;
  priority: string;
  dueDate: string;
  daysOverdue: number;
  threshold: number;
  requiresExplanation: boolean;
  hasExplanation: boolean;
  explanation: string | null;
}

interface OverdueCheckResponse {
  totalOverdue: number;
  requiresExplanation: number;
  explained: number;
  tasks: OverdueTask[];
}

interface Props {
  onExplanationRequired?: (tasks: OverdueTask[]) => void;
  showBanner?: boolean;
}

export default function OverdueTaskAlert({ onExplanationRequired, showBanner = true }: Props) {
  const [data, setData] = useState<OverdueCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<OverdueTask | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverdueTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks/overdue-check');
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (onExplanationRequired && result.requiresExplanation > 0) {
          const needsExplanation = result.tasks.filter(
            (t: OverdueTask) => t.requiresExplanation && !t.hasExplanation
          );
          onExplanationRequired(needsExplanation);
        }
      }
    } catch (err) {
      console.error('Failed to check overdue tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [onExplanationRequired]);

  useEffect(() => {
    fetchOverdueTasks();
  }, [fetchOverdueTasks]);

  const handleSubmitExplanation = async () => {
    if (!selectedTask || explanation.trim().length < 10) {
      setError('Please provide an explanation (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}/explanation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ explanation: explanation.trim() }),
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
        await fetch('/api/tasks/notify-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: selectedTask.id }),
        });
      }

      setShowModal(false);
      setSelectedTask(null);
      setExplanation('');
      fetchOverdueTasks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) return null;

  const needsExplanation = data.tasks.filter(t => t.requiresExplanation && !t.hasExplanation);
  
  if (needsExplanation.length === 0) return null;

  if (!showBanner) return null;

  return (
    <>
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Overdue Tasks Require Attention
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                You have {needsExplanation.length} overdue task(s) that require an explanation before you can proceed.
              </p>
              <ul className="mt-2 space-y-1">
                {needsExplanation.map(task => (
                  <li key={task.id} className="flex items-center justify-between">
                    <span>
                      <strong>{task.title}</strong> - {task.daysOverdue} days overdue ({task.priority} priority)
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowModal(true);
                      }}
                      className="ml-4 text-red-600 hover:text-red-800 underline text-sm"
                    >
                      Provide Explanation
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Explain Overdue Task
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium text-gray-900">{selectedTask.title}</p>
              <p className="text-sm text-gray-600 mt-1">
                {selectedTask.daysOverdue} days overdue | Priority: {selectedTask.priority}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why is this task overdue? *
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md p-3 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Please explain the reason for the delay and your plan to complete this task..."
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
                  setSelectedTask(null);
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
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
