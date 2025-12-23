import React, { useEffect, useState } from "react";
import { PageWithLayout } from "@/types/page";

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

const KpiUploadPage: PageWithLayout = () => {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");

  const [strFile, setStrFile] = useState<File | null>(null);
  const [naFile, setNaFile] = useState<File | null>(null);

  const [strStatus, setStrStatus] = useState<string>("");
  const [naStatus, setNaStatus] = useState<string>("");

  const [recentUploads, setRecentUploads] = useState<AuditUploadItem[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  useEffect(() => {
    async function fetchHotels() {
      try {
        const res = await fetch("/api/hospitality/hotels");
        const data = await res.json();
        if (Array.isArray(data)) {
          setHotels(data.map((h: any) => ({ id: h.id, name: h.name })));
        }
      } catch (e) {
        console.error("Failed to load hotels", e);
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
      // Also include NIGHT_AUDIT_UPLOAD
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

      // Fetch NIGHT_AUDIT uploads as well
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

      setRecentUploads(combined.slice(0, 50));
    } catch (e) {
      console.error("Failed to load audit uploads", e);
    } finally {
      setLoadingUploads(false);
    }
  }

  useEffect(() => {
    fetchRecentUploads();
  }, []);

  const handleStrUpload = async () => {
    if (!selectedHotelId || !strFile) {
      setStrStatus("Please select a property and choose a CSV file.");
      return;
    }

    setStrStatus("Uploading STR file...");

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
        setStrStatus(`Error: ${json.error || "Upload failed"}`);
      } else {
        setStrStatus(
          `Success: Imported ${json.rowsImported} STR rows for property ${json.propertyId}.`
        );
        fetchRecentUploads();
      }
    } catch (e: any) {
      setStrStatus(`Error: ${e?.message || "Upload failed"}`);
    }
  };

  const handleNaUpload = async () => {
    if (!selectedHotelId || !naFile) {
      setNaStatus("Please select a property and choose a CSV file.");
      return;
    }

    setNaStatus("Uploading Night Audit file...");

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
        setNaStatus(`Error: ${json.error || "Upload failed"}`);
      } else {
        setNaStatus(
          `Success: Imported ${json.rowsImported} Night Audit rows for property ${json.propertyId}.`
        );
        fetchRecentUploads();
      }
    } catch (e: any) {
      setNaStatus(`Error: ${e?.message || "Upload failed"}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hotel KPI Uploads</h1>
          <p className="text-xs text-gray-500 mt-1">
            Upload STR and Night Audit files to feed Occ / ADR / RevPAR into dashboards.
          </p>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700">Property</div>
          <select
            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">STR Upload</h2>
          <p className="text-xs text-gray-500">
            CSV or Excel with columns: date, occ, adr, revpar, optional comp_occ/comp_adr/comp_revpar.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setStrFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
          <button
            onClick={handleStrUpload}
            className="px-3 py-1.5 rounded bg-black text-white text-xs"
          >
            Upload STR
          </button>
          {strStatus && (
            <div className="text-xs text-gray-700 mt-1">{strStatus}</div>
          )}
        </div>

        <div className="rounded border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Night Audit Upload</h2>
          <p className="text-xs text-gray-500">
            CSV or Excel with columns: date, rooms_sold, rooms_available (optional), room_revenue.
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setNaFile(e.target.files?.[0] || null)}
            className="text-xs"
          />
          <button
            onClick={handleNaUpload}
            className="px-3 py-1.5 rounded bg-black text-white text-xs"
          >
            Upload Night Audit
          </button>
          {naStatus && (
            <div className="text-xs text-gray-700 mt-1">{naStatus}</div>
          )}
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
            Recent KPI Uploads
          </div>
          <button
            onClick={fetchRecentUploads}
            className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-700"
          >
            Refresh
          </button>
        </div>

        {loadingUploads ? (
          <div className="text-xs text-gray-500">Loading uploads…</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="py-1.5 px-2 border-b">Time</th>
                  <th className="py-1.5 px-2 border-b">Property ID</th>
                  <th className="py-1.5 px-2 border-b">Source</th>
                  <th className="py-1.5 px-2 border-b">Rows Imported</th>
                  <th className="py-1.5 px-2 border-b">Date Range</th>
                </tr>
              </thead>
              <tbody>
                {recentUploads.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-gray-50">
                    <td className="py-1.5 px-2">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="py-1.5 px-2">{u.propertyId ?? "—"}</td>
                    <td className="py-1.5 px-2">{u.source}</td>
                    <td className="py-1.5 px-2">{u.rowsImported ?? "—"}</td>
                    <td className="py-1.5 px-2">
                      {u.dateRange?.from && u.dateRange?.to
                        ? `${u.dateRange.from.slice(0, 10)} → ${u.dateRange.to.slice(0, 10)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
                {recentUploads.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-3 text-center text-xs text-gray-500"
                    >
                      No recent KPI uploads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

KpiUploadPage.title = "KPI Upload";

export default KpiUploadPage;
