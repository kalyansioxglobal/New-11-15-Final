import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canCreateTasks } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import Link from 'next/link';

type Review = {
  id: number;
  source: string;
  externalId: string | null;
  reviewerName: string | null;
  rating: number | null;
  title: string | null;
  comment: string | null;
  language: string;
  reviewDate: string;
  responseText: string | null;
  respondedAt: string | null;
  hotel: { id: number; name: string; brand: string | null; ventureId: number };
  respondedBy: { id: number; fullName: string } | null;
};

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  TRIPADVISOR: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800",
  BOOKING: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  EXPEDIA: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800",
  INTERNAL: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
};

export default function ReviewResponsePage() {
  const router = useRouter();
  const { id } = router.query;
  const { effectiveUser, loading: userLoading } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowRespond = canCreateTasks(role);

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let cancelled = false;

    async function loadReview() {
      try {
        setLoading(true);
        const res = await fetch(`/api/hospitality/reviews/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Review not found');
            router.push('/hospitality/reviews');
            return;
          }
          throw new Error('Failed to load review');
        }

        const data = await res.json();
        if (!cancelled) {
          setReview(data);
          setResponseText(data.responseText || '');
          setIsEditing(!data.responseText);
        }
      } catch (e: any) {
        if (!cancelled) {
          toast.error(e.message || 'Failed to load review');
          router.push('/hospitality/reviews');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReview();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (!userLoading && !allowRespond && !loading) {
      toast.error('You do not have permission to respond to reviews');
      router.push('/hospitality/reviews');
    }
  }, [userLoading, allowRespond, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string' || !review) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/hospitality/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText: responseText.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save response');
      }

      const updated = await res.json();
      setReview(updated);
      setIsEditing(false);
      toast.success('Response saved successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save response');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const fullStars = Math.round(rating);
    return (
      <div className="flex items-center gap-1">
        {'★'.repeat(fullStars)}
        {'☆'.repeat(5 - fullStars)}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({rating.toFixed(1)})</span>
      </div>
    );
  };

  if (loading || userLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="w-full h-[85vh]" />
      </div>
    );
  }

  if (!review || !allowRespond) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/hospitality/reviews"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Respond to Review</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Write a response to the guest review</p>
      </div>

      {/* Review Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    SOURCE_COLORS[review.source] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                  }`}
                >
                  {review.source}
                </span>
                <Link
                  href={`/hospitality/hotels/${review.hotel.id}`}
                  className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {review.hotel.name}
                </Link>
                {review.hotel.brand && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">({review.hotel.brand})</span>
                )}
              </div>
              {review.rating && (
                <div className="mb-2">
                  {renderStars(review.rating)}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : 'No date'}
              </div>
              {review.reviewerName && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  By {review.reviewerName}
                </div>
              )}
            </div>
          </div>

          {review.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{review.title}</h3>
          )}

          {review.comment && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {review.comment}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Response Form Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          {review.responseText && !isEditing && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Current Response</h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-3">
                  {review.responseText}
                </p>
                {review.respondedBy && review.respondedAt && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-green-200 dark:border-green-800 pt-3 mt-3">
                    Responded by {review.respondedBy.fullName} on{' '}
                    {new Date(review.respondedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {(isEditing || !review.responseText) && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Response <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={6}
                  required
                  maxLength={4000}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[150px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                  placeholder="Write your response to the guest review..."
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {responseText.length} / 4000 characters
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    if (review.responseText) {
                      setIsEditing(false);
                      setResponseText(review.responseText);
                    } else {
                      router.push('/hospitality/reviews');
                    }
                  }}
                  className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  disabled={saving}
                >
                  {review.responseText ? 'Cancel' : 'Back to Reviews'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !responseText.trim()}
                  className="btn flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {review.responseText ? 'Update Response' : 'Submit Response'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

