import { useState, useEffect } from "react";
import { Skeleton } from "./ui/Skeleton";
import toast from 'react-hot-toast';

type AttendanceStatus = "PRESENT" | "PTO" | "HALF_DAY" | "SICK" | "REMOTE" | "LATE";

type AttendanceRecord = {
  id: number;
  status: AttendanceStatus;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
      toast.error("Could not load attendance");
    } finally {
      setLoading(false);
    }
  }

  async function markStatus(status: AttendanceStatus) {
    setSaving(true)
    try {
      const res = await fetch("/api/attendance/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Show the specific error message from the API
        const errorMessage = json?.error?.message || "Failed to save attendance";
        // setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      setData((prev) => prev ? { ...prev, today: json.data } : null);
      toast.success("Attendance saved successfully");
      setIsOpen(false);
    } catch (err: any) {
      // console.error("Failed to mark attendance:", err);
      toast.error("Failed to mark attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm">
        <Skeleton className="w-full h-[40px]" />
      </div>
    );
  }

  const currentStatus = data?.today?.status;
  const statusInfo = currentStatus ? STATUS_LABELS[currentStatus] : null;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-sm relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Today&apos;s Attendance</div>
          {currentStatus ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusInfo?.color}`} />
                <span className="font-medium text-gray-900 dark:text-white">
                  {statusInfo?.emoji} {statusInfo?.label}
                </span>
              </div>
              {data?.today && (
                <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                  Marked: {new Date(data.today.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                  {data.today.updatedAt &&
                    data.today.updatedAt !== data.today.createdAt && (
                      <span className="block text-gray-400 dark:text-gray-500">
                        Updated: {new Date(data.today.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    )
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm italic">Not marked yet</div>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={saving}
          className="btn"
        >
          {currentStatus ? "Change" : "Mark Status"}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[160px]">
          {data?.statuses.map((status) => {
            const info = STATUS_LABELS[status];
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                onClick={() => markStatus(status)}
                disabled={saving}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${isSelected
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
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
    </div>
  );
}
