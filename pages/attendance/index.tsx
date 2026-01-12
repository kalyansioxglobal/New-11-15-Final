import { useState, useEffect, useMemo } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

type AttendanceRecord = {
  id: number;
  date: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  venture: {
    id: number;
    name: string;
  } | null;
  office: {
    id: number;
    name: string;
  } | null;
};

type AttendanceData = {
  today: AttendanceRecord | null;
  history: AttendanceRecord[];
  statuses: string[];
};

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bgColor: string; textColor: string }> = {
  PRESENT: { label: "Present", emoji: "✓", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-800 dark:text-green-300" },
  REMOTE: { label: "Remote", emoji: "🏠", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-800 dark:text-blue-300" },
  PTO: { label: "PTO", emoji: "🌴", bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-800 dark:text-purple-300" },
  HALF_DAY: { label: "Half Day", emoji: "½", bgColor: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-800 dark:text-amber-300" },
  SICK: { label: "Sick", emoji: "🤒", bgColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-800 dark:text-red-300" },
  LATE: { label: "Late", emoji: "⏰", bgColor: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-800 dark:text-orange-300" },
};

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Parse selected month
  const [year, month] = selectedMonth.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, 1);
  const today = new Date();
  const isCurrentMonth = selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth();

  // Get all days in the selected month
  const daysInMonth = useMemo(() => {
    const days: Array<{ date: Date; dateStr: string; dayOfWeek: string; isToday: boolean; isPast: boolean }> = [];
    const lastDay = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day);
      const dateStr = date.toISOString().split("T")[0];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today && !isToday;
      
      days.push({
        date,
        dateStr,
        dayOfWeek: dayNames[date.getDay()],
        isToday,
        isPast,
      });
    }
    
    return days;
  }, [year, month, today]);

  // Create a map of date -> attendance record for quick lookup
  const attendanceMap = useMemo(() => {
    if (!attendanceData?.history) return new Map<string, AttendanceRecord>();
    const map = new Map<string, AttendanceRecord>();
    attendanceData.history.forEach((record) => {
      const recordDate = new Date(record.date).toISOString().split("T")[0];
      map.set(recordDate, record);
    });
    return map;
  }, [attendanceData]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Calculate start and end dates for the selected month
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: "100", // Should cover a full month
      });

      const res = await fetch(`/api/attendance/my?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load attendance");
        return;
      }

      const json = await res.json();
      setAttendanceData(json.data);
    } catch (e) {
      console.error("Failed to fetch attendance", e);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || {
      label: status,
      emoji: "•",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-800 dark:text-gray-300",
    };
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const goToPreviousMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;
    setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="space-y-6 dark:bg-gray-900 min-h-screen p-6 text-gray-900 dark:text-white">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View your attendance log for the selected month
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousMonth}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
            aria-label="Previous month"
          >
            ←
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {!isCurrentMonth && (
              <button
                onClick={goToCurrentMonth}
                className="px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors font-medium"
              >
                Today
              </button>
            )}
          </div>
          
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </header>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="p-4">
            <Skeleton className="w-full h-12 mb-2" />
            <Skeleton className="w-full h-12 mb-2" />
            <Skeleton className="w-full h-12 mb-2" />
            <Skeleton className="w-full h-12" />
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Clock-in
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Venture
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Office
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {daysInMonth.map((day, idx) => {
                  const record = attendanceMap.get(day.dateStr);
                  const statusConfig = record ? getStatusConfig(record.status) : null;
                  
                  return (
                    <tr
                      key={day.dateStr}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        day.isToday ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {day.isToday && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          {formatDate(day.date)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {day.dayOfWeek}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {record?.createdAt ? (
                          <span className="font-mono">{formatTime(record.createdAt)}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig?.bgColor} ${statusConfig?.textColor}`}
                          >
                            <span>{statusConfig?.emoji}</span>
                            {statusConfig?.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Not marked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {record?.venture?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {record?.office?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                        {record?.notes ? (
                          <span className="truncate block" title={record.notes}>
                            {record.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {daysInMonth.length === 0 && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No days found for selected month
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && attendanceData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = attendanceData.history.filter((r) => r.status === status).length;
            return (
              <div
                key={status}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{config.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{count}</p>
                  </div>
                  <span className="text-2xl">{config.emoji}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

AttendancePage.title = "My Attendance";

