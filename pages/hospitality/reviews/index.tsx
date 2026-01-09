import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { Skeleton } from "@/components/ui/Skeleton";

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

export default function ReviewsListPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [unrespondedOnly, setUnrespondedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 50;

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowRespond = canCreateTasks(role);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (sourceFilter) params.set("source", sourceFilter);
        if (unrespondedOnly) params.set("unresponded", "true");
        params.set("page", String(page));
        params.set("pageSize", String(ITEMS_PER_PAGE));

        const res = await fetch(`/api/hospitality/reviews?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load reviews");

        const json = await res.json();
        if (!cancelled) {
          setReviews(json.items || []);
          setTotal(json.total || 0);
          setTotalPages(json.totalPages || 1);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceFilter, unrespondedOnly, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [sourceFilter, unrespondedOnly]);

  const sources = ["GOOGLE", "TRIPADVISOR", "BOOKING", "EXPEDIA", "INTERNAL"];

  const avgRating =
    reviews.length > 0
      ? reviews.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) /
      reviews.filter((r) => r.rating).length
      : 0;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Hotel Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and respond to guest reviews
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</div>
          <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">{total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Average Rating</div>
          <div className="text-2xl font-semibold mt-1 text-gray-900 dark:text-white">
            {avgRating ? avgRating.toFixed(1) : "-"} / 5
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Pending Responses</div>
          <div className="text-2xl font-semibold mt-1 text-orange-600 dark:text-orange-400">
            {reviews.filter((r) => !r.responseText).length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
          <input
            type="checkbox"
            checked={unrespondedOnly}
            onChange={(e) => setUnrespondedOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-400 dark:focus:ring-blue-500"
          />
          Unresponded only
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">{error}</div>
      )}

      {loading ? (
        <Skeleton className="w-full h-[85vh]" />
      ) : reviews.length === 0 ? (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">
          No reviews found
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm dark:hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${SOURCE_COLORS[r.source] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                        }`}
                    >
                      {r.source}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{r.hotel.name}</span>
                    {r.rating && (
                      <span className="text-yellow-500 dark:text-yellow-400">
                        {"★".repeat(Math.round(r.rating))}
                        {"☆".repeat(5 - Math.round(r.rating))}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    {new Date(r.reviewDate).toLocaleDateString()}
                  </div>
                </div>

                {r.title && (
                  <h4 className="font-medium text-gray-900 dark:text-white mt-2">{r.title}</h4>
                )}
                {r.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">{r.comment}</p>
                )}

                <div className="flex justify-between items-center mt-3">
                  <div className="text-sm text-gray-400 dark:text-gray-500">
                    By {r.reviewerName || "Anonymous"}
                  </div>
                  {r.responseText ? (
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Responded by {r.respondedBy?.fullName || "Unknown"}
                    </span>
                  ) : allowRespond ? (
                    <Link
                      href={`/hospitality/reviews/${r.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Respond
                    </Link>
                  ) : (
                    <span className="text-sm text-orange-500 dark:text-orange-400">Pending response</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}

ReviewsListPage.title = 'Hotel Reviews';
