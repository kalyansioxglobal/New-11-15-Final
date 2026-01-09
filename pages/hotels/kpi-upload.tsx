import React, { useEffect, useState } from "react";
import { PageWithLayout } from "@/types/page";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

interface HotelOption {
  id: number;
  name: string;
}

interface AuditUploadItem {
  id: number;
  createdAt: string;
  propertyId: number | null;
  source: string;
  rowsImported: number | null;
  dateRange?: { from: string | null; to: string | null } | null;
}

const ITEMS_PER_PAGE = 20;

function renderPagination(currentPage: number, total: number, onPageChange: (page: number) => void) {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

const KpiUploadPage: PageWithLayout = () => {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  const [strFile, setStrFile] = useState<File | null>(null);
  const [naFile, setNaFile] = useState<File | null>(null);
  const [uploadingStr, setUploadingStr] = useState(false);
  const [uploadingNa, setUploadingNa] = useState(false);

  const [recentUploads, setRecentUploads] = useState<AuditUploadItem[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchHotels() {
      setLoadingHotels(true);
      try {
        const res = await fetch("/api/hospitality/hotels?pageSize=200");
        const data = await res.json();
        const hotelsList = Array.isArray(data) ? data : (data?.items || []);
        setHotels(hotelsList.map((h: any) => ({ id: h.id, name: h.name })));
      } catch (e) {
        console.error("Failed to load hotels", e);
        toast.error("Failed to load hotels. Please refresh the page.");
      } finally {
        setLoadingHotels(false);
      }
    }

    fetchHotels();
  }, []);

  async function fetchRecentUploads() {
    setLoadingUploads(true);
    try {
      const params = new URLSearchParams();
      params.set("domain", "hotels");
      params.set("action", "STR_UPLOAD");
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const json = await res.json();
      const items: AuditUploadItem[] = (json.items || []).map((i: any) => ({
        id: i.id,
        createdAt: i.createdAt,
        propertyId: i.metadata?.propertyId ?? null,
        source: i.metadata?.source ?? i.action,
        rowsImported: i.metadata?.rowsImported ?? null,
        dateRange: i.metadata?.dateRange ?? null,
      }));

      const paramsNa = new URLSearchParams();
      paramsNa.set("domain", "hotels");
      paramsNa.set("action", "NIGHT_AUDIT_UPLOAD");
      const resNa = await fetch(`/api/admin/audit-logs?${paramsNa.toString()}`);
      const jsonNa = await resNa.json();
      const itemsNa: AuditUploadItem[] = (jsonNa.items || []).map((i: any) => ({
        id: i.id,
        createdAt: i.createdAt,
        propertyId: i.metadata?.propertyId ?? null,
        source: i.metadata?.source ?? i.action,
        rowsImported: i.metadata?.rowsImported ?? null,
        dateRange: i.metadata?.dateRange ?? null,
      }));

      const combined = [...items, ...itemsNa].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentUploads(combined);
      setCurrentPage(1); // Reset to first page when refreshing
    } catch (e) {
      console.error("Failed to load audit uploads", e);
      toast.error("Failed to load recent uploads. Please try again.");
    } finally {
      setLoadingUploads(false);
    }
  }

  useEffect(() => {
    fetchRecentUploads();
  }, []);

  const handleStrUpload = async () => {
    if (!selectedHotelId || !strFile) {
      toast.error("Please select a property and choose a CSV file.");
      return;
    }

    setUploadingStr(true);
    const formData = new FormData();
    formData.append("file", strFile);
    formData.append("propertyId", selectedHotelId);

    try {
      const res = await fetch("/api/hotels/str/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload failed");
      } else {
        toast.success(`Successfully imported ${json.rowsImported} STR rows for property ${json.propertyId}`);
        setStrFile(null);
        fetchRecentUploads();
      }
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingStr(false);
    }
  };

  const handleNaUpload = async () => {
    if (!selectedHotelId || !naFile) {
      toast.error("Please select a property and choose a CSV file.");
      return;
    }

    setUploadingNa(true);
    const formData = new FormData();
    formData.append("file", naFile);
    formData.append("propertyId", selectedHotelId);

    try {
      const res = await fetch("/api/hotels/night-audit/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload failed");
      } else {
        toast.success(`Successfully imported ${json.rowsImported} Night Audit rows for property ${json.propertyId}`);
        setNaFile(null);
        fetchRecentUploads();
      }
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingNa(false);
    }
  };

  const paginatedUploads = recentUploads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Hotel KPI Uploads</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Upload STR and Night Audit files to feed Occ / ADR / RevPAR into dashboards.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm">
        <div className="space-y-1">
          <label htmlFor="hotel-select" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Property
          </label>
          {loadingHotels ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <select
              id="hotel-select"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
            >
              <option value="">Select property…</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">STR Upload</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            CSV or Excel with columns: date, occ, adr, revpar, optional comp_occ/comp_adr/comp_revpar.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setStrFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
            disabled={uploadingStr}
          />
          {strFile && (
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Selected: {strFile.name}
            </div>
          )}
          <button
            onClick={handleStrUpload}
            disabled={uploadingStr || !selectedHotelId || !strFile}
            className="w-full px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploadingStr ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              "Upload STR"
            )}
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Night Audit Upload</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            CSV or Excel with columns: date, rooms_sold, rooms_available (optional), room_revenue.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setNaFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
            disabled={uploadingNa}
          />
          {naFile && (
            <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Selected: {naFile.name}
            </div>
          )}
          <button
            onClick={handleNaUpload}
            disabled={uploadingNa || !selectedHotelId || !naFile}
            className="w-full px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploadingNa ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              "Upload Night Audit"
            )}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="text-xs font-semibold text-gray-800 dark:text-white uppercase tracking-wide">
            Recent KPI Uploads
          </div>
          <button
            onClick={fetchRecentUploads}
            disabled={loadingUploads}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loadingUploads ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {loadingUploads ? (
          <div className="p-4">
            <Skeleton className="w-full h-96" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Property ID</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rows Imported</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Range</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {paginatedUploads.length > 0 ? (
                    paginatedUploads.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{u.propertyId ?? "—"}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            {u.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300 font-medium">{u.rowsImported ?? "—"}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                          {u.dateRange?.from && u.dateRange?.to
                            ? `${u.dateRange.from.slice(0, 10)} → ${u.dateRange.to.slice(0, 10)}`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="font-medium">No recent KPI uploads found</p>
                          <p className="text-xs mt-1">Upload files above to see them here</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(currentPage, recentUploads.length, setCurrentPage)}
          </>
        )}
      </div>
    </div>
  );
};

KpiUploadPage.title = "KPI Upload";

export default KpiUploadPage;
