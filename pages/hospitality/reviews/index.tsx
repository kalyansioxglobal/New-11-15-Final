import { useState, useEffect } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { canCreateTasks } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

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
  respondedBy: { id: number; name: string } | null;
};

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE: "bg-blue-100 text-blue-800",
  TRIPADVISOR: "bg-green-100 text-green-800",
  BOOKING: "bg-indigo-100 text-indigo-800",
  EXPEDIA: "bg-yellow-100 text-yellow-800",
  INTERNAL: "bg-gray-100 text-gray-800",
};

export default function ReviewsListPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [unrespondedOnly, setUnrespondedOnly] = useState(false);

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
        params.set("page", "1");
        params.set("pageSize", "200");

        const res = await fetch(`/api/hospitality/reviews?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load reviews");

        const json = await res.json();
        if (!cancelled) setReviews(json.items || []);
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
  }, [sourceFilter, unrespondedOnly]);

  const sources = ["GOOGLE", "TRIPADVISOR", "BOOKING", "EXPEDIA", "INTERNAL"];

  const avgRating =
    reviews.length > 0
      ? reviews.filter((r) => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) /
        reviews.filter((r) => r.rating).length
      : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hotel Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and respond to guest reviews
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total Reviews</div>
          <div className="text-2xl font-semibold mt-1">{reviews.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Average Rating</div>
          <div className="text-2xl font-semibold mt-1">
            {avgRating ? avgRating.toFixed(1) : "-"} / 5
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Pending Responses</div>
          <div className="text-2xl font-semibold mt-1 text-orange-600">
            {reviews.filter((r) => !r.responseText).length}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unrespondedOnly}
            onChange={(e) => setUnrespondedOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Unresponded only
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No reviews found
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      SOURCE_COLORS[r.source] || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {r.source}
                  </span>
                  <span className="font-medium">{r.hotel.name}</span>
                  {r.rating && (
                    <span className="text-yellow-500">
                      {"★".repeat(Math.round(r.rating))}
                      {"☆".repeat(5 - Math.round(r.rating))}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(r.reviewDate).toLocaleDateString()}
                </div>
              </div>

              {r.title && (
                <h4 className="font-medium text-gray-900 mt-2">{r.title}</h4>
              )}
              {r.comment && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{r.comment}</p>
              )}

              <div className="flex justify-between items-center mt-3">
                <div className="text-sm text-gray-400">
                  By {r.reviewerName || "Anonymous"}
                </div>
                {r.responseText ? (
                  <span className="text-sm text-green-600">
                    Responded by {r.respondedBy?.name}
                  </span>
                ) : allowRespond ? (
                  <Link
                    href={`/hospitality/reviews/${r.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Respond
                  </Link>
                ) : (
                  <span className="text-sm text-orange-500">Pending response</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ReviewsListPage.title = 'Hotel Reviews';
