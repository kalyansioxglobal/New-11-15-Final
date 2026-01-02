import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

const REVIEW_SOURCES = ["GOOGLE", "TRIPADVISOR", "BOOKING", "EXPEDIA", "OTHER"];

function HotelKpiPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<"kpi" | "reviews">("kpi");
  const [summary, setSummary] = useState<any | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showKpiForm, setShowKpiForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewSummary, setReviewSummary] = useState<any | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    date: today,
    roomsSold: "",
    roomsAvailable: "",
    roomRevenue: "",
    cash: "",
    credit: "",
    online: "",
    refund: "",
    dues: "",
    lostDues: "",
    otherRevenue: "",
  });

  const [reviewFormData, setReviewFormData] = useState({
    source: "GOOGLE",
    reviewerName: "",
    rating: "",
    title: "",
    comment: "",
    reviewDate: today,
  });

  const fetchKpiData = () => {
    if (!id) return;
    const params = new URLSearchParams({ hotelId: String(id) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    fetch(`/api/hotel-kpi?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary || null);
        setRows(d.rows || []);
      })
      .catch(() => {
        setSummary(null);
        setRows([]);
      });
  };

  const fetchReviews = () => {
    if (!id) return;
    fetch(`/api/hospitality/hotels/${id}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setReviewSummary(d.summary || null);
      })
      .catch(() => {
        setReviews([]);
        setReviewSummary(null);
      });
  };

  useEffect(() => {
    fetchKpiData();
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, from, to]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReviewInputChange = (field: string, value: string) => {
    setReviewFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleKpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const sold = Number(formData.roomsSold) || 0;
    const available = Number(formData.roomsAvailable) || 0;
    
    if (sold <= 0 && Number(formData.roomRevenue) <= 0) {
      setMessage({ type: "error", text: "Please enter rooms sold or room revenue" });
      return;
    }
    
    if (available > 0 && sold > available) {
      setMessage({ type: "error", text: "Rooms sold cannot exceed rooms available" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/hotels/${id}/daily-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Daily report saved successfully!" });
        setFormData({
          date: today,
          roomsSold: "",
          roomsAvailable: "",
          roomRevenue: "",
          cash: "",
          credit: "",
          online: "",
          refund: "",
          dues: "",
          lostDues: "",
          otherRevenue: "",
        });
        fetchKpiData();
        setTimeout(() => setShowKpiForm(false), 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const rating = Number(reviewFormData.rating);
    if (reviewFormData.rating && (rating < 1 || rating > 5)) {
      setReviewMessage({ type: "error", text: "Rating must be between 1 and 5" });
      return;
    }

    if (!reviewFormData.comment.trim()) {
      setReviewMessage({ type: "error", text: "Please enter a review comment" });
      return;
    }

    setSavingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetch(`/api/hospitality/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: Number(id),
          source: reviewFormData.source,
          reviewerName: reviewFormData.reviewerName || null,
          rating: reviewFormData.rating ? Number(reviewFormData.rating) : null,
          title: reviewFormData.title || null,
          comment: reviewFormData.comment,
          reviewDate: reviewFormData.reviewDate,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReviewMessage({ type: "success", text: "Review added successfully!" });
        setReviewFormData({
          source: "GOOGLE",
          reviewerName: "",
          rating: "",
          title: "",
          comment: "",
          reviewDate: today,
        });
        fetchReviews();
        setTimeout(() => setShowReviewForm(false), 1500);
      } else {
        setReviewMessage({ type: "error", text: data.error || "Failed to save review" });
      }
    } catch (err) {
      setReviewMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingReview(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-500 dark:text-gray-400">No rating</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}
          >
            ★
          </span>
        ))}
        <span className="ml-1 text-gray-500 dark:text-gray-400">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hotel Details</h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("kpi")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "kpi"
              ? "border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          KPIs & Daily Reports
        </button>
        <button
          onClick={() => setActiveTab("reviews")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === "reviews"
              ? "border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Reviews {reviewSummary?.total > 0 && `(${reviewSummary.total})`}
        </button>
      </div>

      {activeTab === "kpi" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowKpiForm(!showKpiForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              {showKpiForm ? "Cancel" : "+ Add Daily Report"}
            </button>
          </div>

          {showKpiForm && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manual Daily Report Entry</h2>
              
              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    message.type === "success"
                      ? "bg-green-900/50 text-green-300 border border-green-700"
                      : "bg-red-900/50 text-red-300 border border-red-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleKpiSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rooms Sold</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.roomsSold}
                      onChange={(e) => handleInputChange("roomsSold", e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rooms Available</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.roomsAvailable}
                      onChange={(e) => handleInputChange("roomsAvailable", e.target.value)}
                      placeholder="Uses hotel default if empty"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Revenue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Room Revenue ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.roomRevenue}
                        onChange={(e) => handleInputChange("roomRevenue", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Other Revenue ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.otherRevenue}
                        onChange={(e) => handleInputChange("otherRevenue", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cash ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cash}
                        onChange={(e) => handleInputChange("cash", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Credit ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.credit}
                        onChange={(e) => handleInputChange("credit", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Online ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.online}
                        onChange={(e) => handleInputChange("online", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Refund ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.refund}
                        onChange={(e) => handleInputChange("refund", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Dues & Losses</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dues ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.dues}
                        onChange={(e) => handleInputChange("dues", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lost Dues ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.lostDues}
                        onChange={(e) => handleInputChange("lostDues", e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowKpiForm(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-600 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Daily Report"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">From</label>
              <input
                type="date"
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">To</label>
              <input
                type="date"
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Occupancy</div>
                <div className={`text-2xl font-semibold ${summary.lowOcc ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                  {summary.occupancyPct.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">ADR</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${summary.adr.toFixed(0)}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">RevPAR</div>
                <div className={`text-2xl font-semibold ${summary.lowRevpar ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                  ${summary.revpar.toFixed(0)}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Room Rev</div>
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${summary.totalRoomRevenue.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                    <th className="p-3 text-left text-gray-500 dark:text-gray-400 font-medium">Date</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">Rooms Avail</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">Rooms Sold</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">Occ %</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">ADR</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">RevPAR</th>
                    <th className="p-3 text-center text-gray-500 dark:text-gray-400 font-medium">Room Rev</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-200 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="p-3 text-left text-gray-900 dark:text-gray-200">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center text-gray-900 dark:text-gray-200">{r.roomsAvailable}</td>
                      <td className="p-3 text-center text-gray-900 dark:text-gray-200">{r.roomsSold}</td>
                      <td className="p-3 text-center text-gray-900 dark:text-gray-200">{r.occupancyPct.toFixed(1)}%</td>
                      <td className="p-3 text-center text-gray-900 dark:text-gray-200">${r.adr.toFixed(0)}</td>
                      <td className="p-3 text-center text-gray-900 dark:text-gray-200">${r.revpar.toFixed(0)}</td>
                      <td className="p-3 text-center text-green-600 dark:text-green-400 font-medium">${r.roomRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length === 0 && !summary && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No KPI data available for this hotel.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Click &quot;Add Daily Report&quot; above to enter data manually.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            {reviewSummary && (
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Average Rating:</span>
                  <span className="ml-2 text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                    {reviewSummary.avgRating > 0 ? `${reviewSummary.avgRating.toFixed(1)} ★` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Total Reviews:</span>
                  <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">{reviewSummary.total}</span>
                </div>
                {reviewSummary.unrespondedCount > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Needs Response:</span>
                    <span className="ml-2 text-xl font-semibold text-orange-600 dark:text-orange-400">{reviewSummary.unrespondedCount}</span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              {showReviewForm ? "Cancel" : "+ Add Review"}
            </button>
          </div>

          {showReviewForm && (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Guest Review</h2>
              
              {reviewMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    reviewMessage.type === "success"
                      ? "bg-green-900/50 text-green-300 border border-green-700"
                      : "bg-red-900/50 text-red-300 border border-red-700"
                  }`}
                >
                  {reviewMessage.text}
                </div>
              )}

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Source <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={reviewFormData.source}
                      onChange={(e) => handleReviewInputChange("source", e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      {REVIEW_SOURCES.map((src) => (
                        <option key={src} value={src}>
                          {src === "TRIPADVISOR" ? "TripAdvisor" : src.charAt(0) + src.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Rating (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={reviewFormData.rating}
                      onChange={(e) => handleReviewInputChange("rating", e.target.value)}
                      placeholder="e.g. 4.5"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Review Date
                    </label>
                    <input
                      type="date"
                      value={reviewFormData.reviewDate}
                      onChange={(e) => handleReviewInputChange("reviewDate", e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reviewer Name</label>
                    <input
                      type="text"
                      value={reviewFormData.reviewerName}
                      onChange={(e) => handleReviewInputChange("reviewerName", e.target.value)}
                      placeholder="Guest name (optional)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Review Title</label>
                    <input
                      type="text"
                      value={reviewFormData.title}
                      onChange={(e) => handleReviewInputChange("title", e.target.value)}
                      placeholder="Brief summary (optional)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Review Comment <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewFormData.comment}
                    onChange={(e) => handleReviewInputChange("comment", e.target.value)}
                    placeholder="Enter the guest's review..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-600 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReview}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50"
                  >
                    {savingReview ? "Saving..." : "Save Review"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                          {review.source === "TRIPADVISOR" ? "TripAdvisor" : review.source}
                        </span>
                        {renderStars(review.rating)}
                      </div>
                      {review.reviewerName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">by {review.reviewerName}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : "No date"}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">{review.title}</h4>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
                  {review.responseText && (
                    <div className="mt-3 pl-4 border-l-2 border-indigo-500">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Response by {review.respondedBy?.fullName || "Staff"}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{review.responseText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No reviews yet for this hotel.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Click &quot;Add Review&quot; above to enter guest reviews manually.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

HotelKpiPage.title = "Hotel Details";

export default HotelKpiPage;
