import Link from 'next/link';
import { Skeleton } from '@/components/ui/Skeleton';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

interface Review {
  id: number;
  source: string;
  externalId: string | null;
  reviewerName: string | null;
  rating: number | null;
  title: string | null;
  comment: string | null;
  language: string;
  reviewDate: string | null;
  responseText: string | null;
  respondedAt: string | null;
  respondedBy: { id: number; fullName?: string; name?: string } | null;
}

interface ReviewsSummary {
  total: number;
  averageRating: number;
  unresponded: number;
  bySource: Record<string, number>;
}

interface ReviewsTabProps {
  reviews: Review[];
  reviewsSummary: ReviewsSummary | null;
  reviewsTotal: number;
  reviewsPage: number;
  onAddReview: () => void;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  TRIPADVISOR: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
  BOOKING: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
  EXPEDIA: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800',
  INTERNAL: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
};

const ITEMS_PER_PAGE = 50;

function renderPagination(currentPage: number, total: number, onPageChange: (page: number) => void) {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function ReviewsTab({
  reviews,
  reviewsSummary,
  reviewsTotal,
  reviewsPage,
  onAddReview,
  onPageChange,
  loading = false,
}: ReviewsTabProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Reviews</div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="font-semibold text-lg text-gray-900 dark:text-white">
              {reviewsSummary?.total ?? reviewsTotal}
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Rating</div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="font-semibold text-lg text-gray-900 dark:text-white">
              {reviewsSummary?.averageRating ? reviewsSummary.averageRating.toFixed(1) : '—'}
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Unresponded</div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className={`font-semibold text-lg ${
              (reviewsSummary?.unresponded ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
            }`}>
              {reviewsSummary?.unresponded ?? 0}
            </div>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sources</div>
          {loading ? (
            <div className="flex flex-wrap gap-1 mt-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1">
              {reviewsSummary?.bySource &&
                Object.entries(reviewsSummary.bySource).map(([src, cnt]) => (
                  <span key={src} className={`px-1.5 py-0.5 rounded text-xs ${SOURCE_COLORS[src] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
                    {src}: {cnt}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Header with Add Review Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Reviews</h2>
        <button
          onClick={onAddReview}
          className="btn"
        >
          + Add Review
        </button>
      </div>

      {/* Reviews List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800">
        {loading && reviews.length === 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reviews.length ? (
              reviews.map(r => (
                <div key={r.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_COLORS[r.source] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}>
                          {r.source}
                        </span>
                        {r.rating && (
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}
                            <span className="text-gray-600 dark:text-gray-400 ml-1">{r.rating.toFixed(1)}</span>
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(r.reviewDate)}
                        </span>
                      </div>
                      {r.title && (
                        <div className="font-medium text-sm mb-1 text-gray-900 dark:text-white">{r.title}</div>
                      )}
                      {r.comment && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{r.comment}</p>
                      )}
                      {r.reviewerName && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">— {r.reviewerName}</div>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      {r.responseText ? (
                        <span className="text-green-600 dark:text-green-400">Responded</span>
                      ) : (
                        <Link
                          href={`/hospitality/reviews/${r.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Respond
                        </Link>
                      )}
                    </div>
                  </div>
                  {r.responseText && (
                    <div className="mt-3 ml-4 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Response by {(r.respondedBy as any)?.fullName || (r.respondedBy as any)?.name || 'Staff'}
                        {r.respondedAt && ` on ${formatDate(r.respondedAt)}`}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{r.responseText}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                No reviews found for this hotel.
              </div>
            )}
          </div>
        )}
        {!loading && renderPagination(reviewsPage, reviewsTotal, onPageChange)}
      </div>
    </div>
  );
}
