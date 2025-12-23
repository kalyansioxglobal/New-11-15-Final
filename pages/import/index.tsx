import React, { useState, useRef, useCallback } from "react";
import { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { canUploadKpis, canAccessAdminPanel } from "@/lib/permissions";

type UploadTab = "flexible" | "ringcentral" | "tms" | "financial" | "freight_kpi" | "hotel_kpi";

interface ImportPageProps {
  canAccessKpis: boolean;
  canAccessAdmin: boolean;
}

interface UploadResult {
  jobId: number;
  fileName: string;
  columns: string[];
  sampleRows: string[][];
  totalRows: number;
  suggestedMappings?: {
    id: number;
    name: string;
    type: string;
    configJson: Record<string, string>;
  }[];
}

interface ValidationResult {
  jobId: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; column: string; message: string }[];
  preview: Record<string, unknown>[];
}

const IMPORT_TYPES = [
  { id: "LOADS", label: "Freight Loads", icon: "🚛" },
  { id: "SHIPPERS", label: "Shippers", icon: "📦" },
  { id: "CARRIERS", label: "Carriers", icon: "🚚" },
  { id: "HOTEL_DAILY", label: "Hotel Daily (PMS)", icon: "🏨" },
  { id: "HOTEL_KPIS", label: "Hotel KPIs", icon: "📈" },
  { id: "FREIGHT_KPIS", label: "Freight KPIs", icon: "📊" },
  { id: "HOTEL_DISPUTES", label: "Hotel Disputes", icon: "⚠️" },
  { id: "HOTEL_REVIEWS", label: "Hotel Reviews", icon: "⭐" },
  { id: "BPO_METRICS", label: "BPO Metrics", icon: "📞" },
] as const;

const FIELD_OPTIONS: Record<string, { label: string; fields: { id: string; label: string; required?: boolean }[] }> = {
  LOADS: {
    label: "Freight Loads",
    fields: [
      { id: "referenceNumber", label: "Reference / Load #", required: true },
      { id: "pickupDate", label: "Pickup Date" },
      { id: "deliveryDate", label: "Delivery Date" },
      { id: "shipperName", label: "Shipper Name" },
      { id: "customerName", label: "Customer Name" },
      { id: "originCity", label: "Origin City" },
      { id: "originState", label: "Origin State" },
      { id: "originZip", label: "Origin Zip" },
      { id: "destCity", label: "Destination City" },
      { id: "destState", label: "Destination State" },
      { id: "destZip", label: "Destination Zip" },
      { id: "equipment", label: "Equipment Type" },
      { id: "weight", label: "Weight" },
      { id: "customerRate", label: "Customer Rate" },
      { id: "carrierRate", label: "Carrier Rate" },
      { id: "margin", label: "Margin" },
      { id: "notes", label: "Notes" },
    ],
  },
  SHIPPERS: {
    label: "Shippers",
    fields: [
      { id: "name", label: "Company Name", required: true },
      { id: "contact", label: "Contact Name" },
      { id: "email", label: "Email" },
      { id: "phone", label: "Phone" },
      { id: "address", label: "Address" },
      { id: "city", label: "City" },
      { id: "state", label: "State" },
      { id: "zip", label: "Zip Code" },
      { id: "notes", label: "Notes" },
    ],
  },
  CARRIERS: {
    label: "Carriers",
    fields: [
      { id: "name", label: "Carrier Name", required: true },
      { id: "mcNumber", label: "MC Number" },
      { id: "dotNumber", label: "DOT Number" },
      { id: "phone", label: "Phone" },
      { id: "email", label: "Email" },
      { id: "address", label: "Address" },
      { id: "city", label: "City" },
      { id: "state", label: "State" },
      { id: "zip", label: "Zip Code" },
      { id: "equipment", label: "Equipment Types" },
      { id: "lanes", label: "Preferred Lanes" },
      { id: "notes", label: "Notes" },
    ],
  },
  HOTEL_DAILY: {
    label: "Hotel Daily (PMS Export)",
    fields: [
      { id: "date", label: "Date", required: true },
      { id: "hotelId", label: "Hotel/Property ID", required: true },
      { id: "totalRoom", label: "Total Rooms" },
      { id: "roomSold", label: "Rooms Sold" },
      { id: "cash", label: "Cash" },
      { id: "credit", label: "Credit" },
      { id: "online", label: "Online" },
      { id: "refund", label: "Refund" },
      { id: "total", label: "Total Revenue" },
      { id: "dues", label: "Dues" },
      { id: "lostDues", label: "Lost Dues" },
      { id: "occupancy", label: "Occupancy %" },
      { id: "revpar", label: "RevPAR" },
    ],
  },
  HOTEL_KPIS: {
    label: "Hotel KPIs",
    fields: [
      { id: "date", label: "Date", required: true },
      { id: "hotelId", label: "Hotel/Property ID", required: true },
      { id: "ventureId", label: "Venture ID (optional, derived from hotel)" },
      { id: "roomsSold", label: "Rooms Sold" },
      { id: "roomsAvailable", label: "Rooms Available" },
      { id: "occupancyPct", label: "Occupancy %" },
      { id: "roomRevenue", label: "Room Revenue" },
      { id: "adr", label: "ADR" },
      { id: "revpar", label: "RevPAR" },
      { id: "otherRevenue", label: "Other Revenue" },
      { id: "totalRevenue", label: "Total Revenue" },
      { id: "grossOperatingProfit", label: "Gross Operating Profit" },
      { id: "goppar", label: "GOPPAR" },
      { id: "cancellations", label: "Cancellations" },
      { id: "noShows", label: "No Shows" },
      { id: "walkins", label: "Walk-ins" },
      { id: "complaints", label: "Complaints" },
      { id: "roomsOutOfOrder", label: "Rooms Out of Order" },
      { id: "reviewScore", label: "Review Score" },
    ],
  },
  FREIGHT_KPIS: {
    label: "Freight KPIs",
    fields: [
      { id: "date", label: "Date", required: true },
      { id: "ventureId", label: "Venture ID", required: true },
      { id: "loadsInbound", label: "Loads Inbound" },
      { id: "loadsQuoted", label: "Loads Quoted" },
      { id: "loadsCovered", label: "Loads Covered" },
      { id: "loadsLost", label: "Loads Lost" },
      { id: "totalRevenue", label: "Total Revenue" },
      { id: "totalCost", label: "Total Cost" },
      { id: "totalProfit", label: "Total Profit" },
      { id: "avgMarginPct", label: "Avg Margin %" },
      { id: "activeShippers", label: "Active Shippers" },
      { id: "newShippers", label: "New Shippers" },
      { id: "churnedShippers", label: "Churned Shippers" },
      { id: "reactivatedShippers", label: "Reactivated Shippers" },
      { id: "atRiskShippers", label: "At-Risk Shippers" },
      { id: "activeCarriers", label: "Active Carriers" },
      { id: "newCarriers", label: "New Carriers" },
    ],
  },
  HOTEL_DISPUTES: {
    label: "Hotel Disputes",
    fields: [
      { id: "propertyId", label: "Property ID", required: true },
      { id: "type", label: "Dispute Type", required: true },
      { id: "disputedAmount", label: "Disputed Amount", required: true },
      { id: "originalAmount", label: "Original Amount" },
      { id: "channel", label: "Channel" },
      { id: "reservationId", label: "Reservation ID" },
      { id: "folioNumber", label: "Folio Number" },
      { id: "guestName", label: "Guest Name" },
      { id: "guestEmail", label: "Guest Email" },
      { id: "guestPhone", label: "Guest Phone" },
      { id: "postedDate", label: "Posted Date" },
      { id: "stayFrom", label: "Stay From" },
      { id: "stayTo", label: "Stay To" },
      { id: "reason", label: "Reason" },
      { id: "evidenceDueDate", label: "Evidence Due Date" },
    ],
  },
  HOTEL_REVIEWS: {
    label: "Hotel Reviews",
    fields: [
      { id: "propertyId", label: "Property ID", required: true },
      { id: "rating", label: "Rating", required: true },
      { id: "source", label: "Source" },
      { id: "guestName", label: "Guest Name" },
      { id: "reviewDate", label: "Review Date" },
      { id: "title", label: "Review Title" },
      { id: "reviewText", label: "Review Text" },
      { id: "responseText", label: "Response Text" },
    ],
  },
  BPO_METRICS: {
    label: "BPO Metrics",
    fields: [
      { id: "date", label: "Date", required: true },
      { id: "campaignId", label: "Campaign ID", required: true },
      { id: "outboundCalls", label: "Outbound Calls" },
      { id: "handledCalls", label: "Handled Calls" },
      { id: "talkTimeMin", label: "Talk Time (min)" },
      { id: "leadsCreated", label: "Leads Created" },
      { id: "demosBooked", label: "Demos Booked" },
      { id: "salesClosed", label: "Sales Closed" },
      { id: "fteCount", label: "FTE Count" },
      { id: "avgQaScore", label: "Avg QA Score" },
      { id: "revenue", label: "Revenue" },
      { id: "cost", label: "Cost" },
    ],
  },
};

export const getServerSideProps: GetServerSideProps<ImportPageProps> = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const canAccessKpis = canUploadKpis(user.role);
  const canAccessAdmin = canAccessAdminPanel(user.role);

  if (!canAccessKpis && !canAccessAdmin) {
    return { redirect: { destination: "/overview", permanent: false } };
  }

  return { props: { canAccessKpis, canAccessAdmin } };
};

function ImportPage({ canAccessKpis, canAccessAdmin }: ImportPageProps) {
  const [activeTab, setActiveTab] = useState<UploadTab>("flexible");
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [step, setStep] = useState<"upload" | "map" | "validate" | "done">("upload");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedType, setSelectedType] = useState<string>("LOADS");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [templateName, setTemplateName] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const flexInputRef = useRef<HTMLInputElement | null>(null);

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = cols[idx]?.trim() ?? "";
      });
      return row;
    });
    return rows;
  }

  async function handleFileUpload(file: File, endpoint: string, key: string, useJson: boolean = false) {
    if (!file) return;
    setLoadingKey(key);
    setResults((prev) => ({ ...prev, [key]: null }));

    try {
      let res;
      if (useJson) {
        const text = await file.text();
        const rows = parseCsv(text);
        if (!rows.length) {
          setResults((prev) => ({ ...prev, [key]: { error: "No data rows found in CSV." } }));
          setLoadingKey(null);
          return;
        }
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
      } else {
        res = await fetch(endpoint, { method: "POST", body: file });
      }
      const data = await res.json();
      setResults((prev) => ({ ...prev, [key]: data }));
    } catch (err: unknown) {
      setResults((prev) => ({
        ...prev,
        [key]: { error: err instanceof Error ? err.message : "Unknown error" },
      }));
    } finally {
      setLoadingKey(null);
      if (fileInputRefs.current[key]) {
        fileInputRefs.current[key]!.value = "";
      }
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFlexibleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const uploadFlexibleFile = async (file: File) => {
    setLoadingKey("flex");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setUploadResult(data);
      const initialMapping: Record<string, string> = {};
      data.columns.forEach((col: string) => {
        initialMapping[col] = "__ignore__";
      });
      setColumnMapping(initialMapping);
      setStep("map");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleValidate = async () => {
    if (!uploadResult) return;
    setLoadingKey("validate");

    try {
      await fetch(`/api/import/job/${uploadResult.jobId}/mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          mappingName: saveAsTemplate ? templateName : undefined,
          columnToField: columnMapping,
          saveAsTemplate,
        }),
      });

      const res = await fetch(`/api/import/job/${uploadResult.jobId}/validate`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setValidationResult(data);
      setStep("validate");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setLoadingKey(null);
    }
  };

  const handleImport = async () => {
    if (!uploadResult) return;
    setImporting(true);

    try {
      const res = await fetch(`/api/import/job/${uploadResult.jobId}/commit`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setImportResult({ successCount: data.successCount, errorCount: data.errorCount });
      setStep("done");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetFlexibleImport = () => {
    setStep("upload");
    setUploadResult(null);
    setSelectedType("LOADS");
    setColumnMapping({});
    setTemplateName("");
    setSaveAsTemplate(false);
    setValidationResult(null);
    setImportResult(null);
  };

  const tabs: { id: UploadTab; label: string; icon: string; adminOnly?: boolean; kpiOnly?: boolean }[] = [
    { id: "flexible", label: "Flexible Import", icon: "📁" },
    { id: "ringcentral", label: "RingCentral", icon: "📞", adminOnly: true },
    { id: "tms", label: "TMS Loads", icon: "🚛", adminOnly: true },
    { id: "financial", label: "3PL Financial", icon: "💰", adminOnly: true },
    { id: "freight_kpi", label: "Freight KPIs", icon: "📊", kpiOnly: true },
    { id: "hotel_kpi", label: "Hotel KPIs", icon: "🏨", kpiOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && !canAccessAdmin) return false;
    if (tab.kpiOnly && !canAccessKpis) return false;
    return true;
  });

  const freightHeaders = ["ventureId", "date", "loadsInbound", "loadsQuoted", "loadsCovered", "loadsLost", "totalRevenue", "totalCost", "activeShippers", "newShippers", "activeCarriers", "newCarriers"];
  const hotelHeaders = ["ventureId", "hotelId", "date", "roomsAvailable", "roomsSold", "roomRevenue", "otherRevenue", "roomsOutOfOrder"];

  const renderUploadSection = (key: string, title: string, description: string, endpoint: string, buttonLabel: string, buttonColor: string, useJson: boolean = false, headers?: string[]) => (
    <div className="bg-white border rounded-xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>

      {headers && (
        <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
          <div className="font-medium text-sm">Expected CSV Headers:</div>
          <pre className="text-xs bg-white border rounded p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {headers.join(", ")}
          </pre>
          <p className="text-xs text-gray-500">Each row should contain values for all columns. Date format: YYYY-MM-DD.</p>
        </div>
      )}

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-medium block mb-2">Select CSV or XLSX file:</span>
          <input
            ref={(el) => { fileInputRefs.current[key] = el; }}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, endpoint, key, useJson);
            }}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
          />
        </label>

        {loadingKey === key && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${buttonColor} text-white flex items-center gap-2`}>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Uploading...
          </div>
        )}
      </div>

      {results[key] ? (
        <div className={`p-4 rounded-lg text-sm ${(results[key] as Record<string, unknown>).error ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"}`}>
          {(results[key] as Record<string, unknown>).error ? (
            <div>Error: {String((results[key] as Record<string, unknown>).error)}</div>
          ) : (
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(results[key], null, 2)}</pre>
          )}
        </div>
      ) : null}
    </div>
  );

  const downloadTemplate = (type: string) => {
    window.open(`/api/import/template?type=${type}`, "_blank");
  };

  const renderFlexibleImport = () => {
    if (step === "upload") {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-lg">Flexible File Import</h2>
              <p className="text-sm text-gray-500 mt-1">
                Drop any tabular file (CSV, XLSX, TSV, TXT) and map columns to fields. Save mappings as templates for one-click imports.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Download Template</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {IMPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => downloadTemplate(t.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg font-medium text-gray-700 mb-2">Drop your file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <input
              ref={flexInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFlexibleFile(file);
              }}
              className="hidden"
            />
            <button
              onClick={() => flexInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Choose File
            </button>
            <p className="text-xs text-gray-400 mt-4">Supports: CSV, XLSX, XLS, TSV, TXT</p>
          </div>

          {loadingKey === "flex" && (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing file...
            </div>
          )}
        </div>
      );
    }

    if (step === "map" && uploadResult) {
      const typeFields = FIELD_OPTIONS[selectedType]?.fields || [];

      return (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Map Columns</h2>
              <p className="text-sm text-gray-500 mt-1">
                {uploadResult.fileName} - {uploadResult.totalRows} rows detected
              </p>
            </div>
            <button onClick={resetFlexibleImport} className="text-sm text-gray-500 hover:text-gray-700">
              Start Over
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">What are you importing?</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {IMPORT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-medium text-sm">Column Mapping</h3>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {uploadResult.columns.map((col, idx) => (
                <div key={idx} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-1/3">
                    <div className="font-medium text-sm">{col}</div>
                    <div className="text-xs text-gray-400 truncate">
                      Sample: {uploadResult.sampleRows?.[0]?.[idx] || "-"}
                    </div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="flex-1">
                    <select
                      value={columnMapping[col] || "__ignore__"}
                      onChange={(e) => setColumnMapping((prev) => ({ ...prev, [col]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="__ignore__">-- Ignore --</option>
                      {typeFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.label} {field.required ? "*" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Data Preview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    {uploadResult.columns.map((col, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(uploadResult.sampleRows || []).slice(0, 5).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-t">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-3 py-2 truncate max-w-32">{cell || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveTemplate"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="saveTemplate" className="text-sm">Save this mapping as a reusable template</label>
            </div>
            {saveAsTemplate && (
              <input
                type="text"
                placeholder="Template name (e.g., 'TQL Load Export')"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={resetFlexibleImport}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleValidate}
              disabled={loadingKey === "validate"}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loadingKey === "validate" && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Validate Data
            </button>
          </div>
        </div>
      );
    }

    if (step === "validate" && validationResult) {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Validation Results</h2>
              <p className="text-sm text-gray-500 mt-1">Review the data before importing</p>
            </div>
            <button onClick={resetFlexibleImport} className="text-sm text-gray-500 hover:text-gray-700">
              Start Over
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{validationResult.totalRows}</div>
              <div className="text-sm text-gray-500">Total Rows</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{validationResult.validRows}</div>
              <div className="text-sm text-green-600">Valid Rows</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${validationResult.invalidRows > 0 ? "bg-red-50" : "bg-gray-50"}`}>
              <div className={`text-2xl font-bold ${validationResult.invalidRows > 0 ? "text-red-600" : "text-gray-400"}`}>
                {validationResult.invalidRows}
              </div>
              <div className={`text-sm ${validationResult.invalidRows > 0 ? "text-red-600" : "text-gray-400"}`}>Invalid Rows</div>
            </div>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                <h3 className="font-medium text-sm text-red-800">Errors ({validationResult.errors.length})</h3>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-red-100">
                {validationResult.errors.slice(0, 20).map((err, idx) => (
                  <div key={idx} className="px-4 py-2 text-sm">
                    <span className="font-medium text-red-600">Row {err.row}:</span>{" "}
                    <span className="text-gray-700">{err.column} - {err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 px-4 py-3 border-b">
                <h3 className="font-medium text-sm text-green-800">Preview of Valid Records</h3>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="text-xs">{JSON.stringify(validationResult.preview.slice(0, 3), null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep("map")} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Back to Mapping
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validationResult.validRows === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {importing && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Import {validationResult.validRows} Rows
            </button>
          </div>
        </div>
      );
    }

    if (step === "done" && importResult) {
      return (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Import Complete!</h2>
            <p className="text-gray-600">
              Successfully imported {importResult.successCount} records
              {importResult.errorCount > 0 && ` (${importResult.errorCount} errors)`}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={resetFlexibleImport}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Import Another File
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Data Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload files to import data from external systems. Use Flexible Import for custom column mapping.
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== "flexible") resetFlexibleImport();
              }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === "flexible" && renderFlexibleImport()}

        {activeTab === "ringcentral" && canAccessAdmin &&
          renderUploadSection("rc", "RingCentral Call Report", "Maps RingCentral users to Command Center users via email & extension.", "/api/import/ringcentral", "Upload RC CSV", "bg-emerald-600")}

        {activeTab === "tms" && canAccessAdmin &&
          renderUploadSection("tms", "TMS Loads Export", "Creates or updates loads, shippers, customers, and carriers from your TMS export file.", "/api/import/tms-loads", "Upload TMS CSV", "bg-blue-600")}

        {activeTab === "financial" && canAccessAdmin &&
          renderUploadSection("fin", "3PL Financial / AR Report", "Attaches billing, cost, margin, and AR status to loads by load number.", "/api/import/tms-3pl-financial", "Upload 3PL CSV", "bg-amber-600")}

        {activeTab === "freight_kpi" && canAccessKpis &&
          renderUploadSection("freight_kpi", "Freight KPI Daily Data", "Upload daily freight metrics including loads, revenue, coverage, and shipper/carrier counts.", "/api/freight-kpi/bulk-upsert", "Upload Freight KPIs", "bg-indigo-600", true, freightHeaders)}

        {activeTab === "hotel_kpi" && canAccessKpis &&
          renderUploadSection("hotel_kpi", "Hotel KPI Daily Data", "Upload daily hotel metrics including rooms sold, revenue, and occupancy data.", "/api/hotel-kpi/bulk-upsert", "Upload Hotel KPIs", "bg-purple-600", true, hotelHeaders)}
      </div>

      <div className="text-xs text-gray-400 pt-6 mt-6 border-t">
        <p>
          <strong>Tip:</strong> The Flexible Import tab supports drag-and-drop for CSV, XLSX, and TXT files. Save your column mappings as templates for faster future imports.
        </p>
      </div>
    </div>
  );
}

ImportPage.title = "Data Import";

export default ImportPage;
