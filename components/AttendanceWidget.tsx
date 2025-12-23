import { useState, useEffect } from "react";

type AttendanceStatus = "PRESENT" | "PTO" | "HALF_DAY" | "SICK" | "REMOTE" | "LATE";

type AttendanceRecord = {
  id: number;
  status: AttendanceStatus;
  date: string;
  notes: string | null;
};

type AttendanceData = {
  today: AttendanceRecord | null;
  statuses: AttendanceStatus[];
};

const STATUS_LABELS: Record<AttendanceStatus, { label: string; emoji: string; color: string }> = {
  PRESENT: { label: "Present", emoji: "✓", color: "bg-green-500" },
  REMOTE: { label: "Remote", emoji: "🏠", color: "bg-blue-500" },
  PTO: { label: "PTO", emoji: "🌴", color: "bg-purple-500" },
  HALF_DAY: { label: "Half Day", emoji: "½", color: "bg-amber-500" },
  SICK: { label: "Sick", emoji: "🤒", color: "bg-red-500" },
  LATE: { label: "Late", emoji: "⏰", color: "bg-orange-500" },
};

export default function AttendanceWidget() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  async function fetchAttendance() {
    try {
      const res = await fetch("/api/attendance/my");
      if (!res.ok) throw new Error("Failed to load attendance");
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError("Could not load attendance");
    } finally {
      setLoading(false);
    }
  }

  async function markStatus(status: AttendanceStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const json = await res.json();
      setData((prev) => prev ? { ...prev, today: json.data } : null);
      setIsOpen(false);
    } catch (err) {
      setError("Could not save attendance");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
        <div className="text-sm text-gray-500">Loading attendance...</div>
      </div>
    );
  }

  const currentStatus = data?.today?.status;
  const statusInfo = currentStatus ? STATUS_LABELS[currentStatus] : null;

  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm relative">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500 mb-1">Today&apos;s Attendance</div>
          {currentStatus ? (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusInfo?.color}`} />
              <span className="font-medium text-gray-900">
                {statusInfo?.emoji} {statusInfo?.label}
              </span>
            </div>
          ) : (
            <div className="text-gray-400 text-sm italic">Not marked yet</div>
          )}
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {currentStatus ? "Change" : "Mark Status"}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px]">
          {data?.statuses.map((status) => {
            const info = STATUS_LABELS[status];
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => markStatus(status)}
                disabled={saving}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${info.color}`} />
                <span>{info.emoji}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600">{error}</div>
      )}
    </div>
  );
}
