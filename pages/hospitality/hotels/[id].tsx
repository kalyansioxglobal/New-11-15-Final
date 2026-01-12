import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTestMode } from '../../../contexts/TestModeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { canCreateTasks } from '@/lib/permissions';
import type { UserRole } from '@prisma/client';
import toast from 'react-hot-toast';
import EditHotelModal from '@/components/hospitality/hotels/EditHotelModal';
import DeleteHotelModal from '@/components/hospitality/hotels/DeleteHotelModal';
import ReviewsTab from '@/components/hospitality/hotels/ReviewsTab';
import AddReviewModal from '@/components/hospitality/hotels/AddReviewModal';
import OverviewTab from '@/components/hospitality/hotels/OverviewTab';
import DailyReportsTab from '@/components/hospitality/hotels/DailyReportsTab';

interface Hotel {
  id: number;
  name: string;
  brand: string | null;
  code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  rooms: number | null;
  status: string;
  venture: { id: number; name: string };
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

type Venture = { id: number; name: string; type: string };

export default function HotelDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { testMode } = useTestMode();
  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const allowEdit = canCreateTasks(role);

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<ReviewsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'reports' | 'reviews'>('overview');
  
  // Edit/Delete modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [ventures, setVentures] = useState<Venture[]>([]);
  
  // Pagination state
  const [metricsPage, setMetricsPage] = useState(1);
  const [reportsPage, setReportsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    if (allowEdit && testMode !== undefined) {
      fetch(`/api/ventures?types=HOSPITALITY&includeTest=${testMode}`)
        .then((r) => r.json())
        .then((d) => {
          setVentures(d as Venture[]);
        })
        .catch(() => {});
    }
  }, [allowEdit, testMode]);

  const loadHotel = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch hotel info
      const hRes = await fetch(`/api/hospitality/hotels/${id}`);
      if (hRes.ok) {
        const h = await hRes.json();
        setHotel(h);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      // Fetch more items for pagination (backend limit is 200)
      const limit = Math.min(ITEMS_PER_PAGE * reviewsPage, 200);
      const rRes = await fetch(`/api/hospitality/hotels/${id}/reviews?limit=${limit}&includeTest=${testMode}`);
      if (rRes.ok) {
        const r = await rRes.json();
        const allReviews = r.reviews || [];
        setReviewsTotal(allReviews.length);
        // Frontend pagination
        const startIndex = (reviewsPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        setReviews(allReviews.slice(startIndex, endIndex));
        setReviewsSummary(r.summary || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    loadHotel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, testMode]);

  useEffect(() => {
    if (id && tab === 'reviews') {
      loadReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, testMode, tab, reviewsPage]);

  // Reset pagination when switching tabs
  useEffect(() => {
    if (tab === 'overview') {
      setMetricsPage(1);
    } else if (tab === 'reports') {
      setReportsPage(1);
    } else if (tab === 'reviews') {
      setReviewsPage(1);
    }
  }, [tab]);

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleHotelUpdate = (updatedHotel: Hotel) => {
    setHotel(updatedHotel);
  };

  if (loading && !hotel) {
    return (
     <Skeleton className="w-full h-[85vh]" />
    );
  }

  if (!hotel) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600 dark:text-red-400">Hotel not found.</p>
        <Link href="/hospitality/hotels" className="text-blue-600 dark:text-blue-400 underline text-sm mt-2 inline-block">
          Back to Hotels
        </Link>
      </div>
    );
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{hotel.name}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {[hotel.brand, hotel.city, hotel.state, hotel.country]
              .filter(Boolean)
              .join(' | ')}
            {hotel.rooms && ` | ${hotel.rooms} rooms`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allowEdit && (
            <>
              <button
                onClick={handleEdit}
                className="px-3 py-1 rounded border border-blue-300 dark:border-blue-600 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1 rounded border border-red-300 dark:border-red-600 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                Delete
              </button>
            </>
          )}
          <Link
            href="/hospitality/hotels"
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Back to Hotels
          </Link>
          <Link
            href="/hospitality/dashboard"
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 text-sm flex gap-4">
        <button
          onClick={() => setTab('overview')}
          className={`pb-2 transition-colors ${
            tab === 'overview'
              ? 'border-b-2 border-black dark:border-white font-semibold text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`pb-2 transition-colors ${
            tab === 'reports'
              ? 'border-b-2 border-black dark:border-white font-semibold text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Daily Reports
        </button>
        <button
          onClick={() => setTab('reviews')}
          className={`pb-2 transition-colors ${
            tab === 'reviews'
              ? 'border-b-2 border-black dark:border-white font-semibold text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Reviews ({reviewsSummary?.total ?? reviewsTotal})
        </button>
      </div>

      {tab === 'overview' && hotel && (
        <OverviewTab
          hotelId={Array.isArray(id) ? id[0] : id}
          testMode={testMode || false}
          hotelRooms={hotel.rooms}
          metricsPage={metricsPage}
          onPageChange={setMetricsPage}
        />
      )}

      {tab === 'reports' && (
        <DailyReportsTab
          hotelId={Array.isArray(id) ? id[0] : id}
          reportsPage={reportsPage}
          onPageChange={setReportsPage}
        />
      )}

      {tab === 'reviews' && (
        <ReviewsTab
          reviews={reviews}
          reviewsSummary={reviewsSummary}
          reviewsTotal={reviewsTotal}
          reviewsPage={reviewsPage}
          onAddReview={() => setShowReviewModal(true)}
          onPageChange={setReviewsPage}
          loading={reviewsLoading}
        />
      )}

      {/* Add Review Modal */}
      {id && (
        <AddReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          hotelId={Number(id)}
          testMode={testMode || false}
          onSuccess={loadReviews}
        />
      )}

      {/* Edit Modal */}
      <EditHotelModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        hotel={hotel}
        onSuccess={handleHotelUpdate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteHotelModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        hotel={hotel}
      />
    </div>
  );
}

HotelDetailPage.title = 'Hotel Details';
