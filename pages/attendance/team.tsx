import { Skeleton } from "@/components/ui/Skeleton";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type AttendanceStatus = "PRESENT" | "PTO" | "HALF_DAY" | "SICK" | "REMOTE" | "LATE";

type TeamMember = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  ventures: { id: number; name: string }[];
  attendance: {
    status: AttendanceStatus;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  hasMarkedToday: boolean;
};

type Summary = {
  total: number;
  marked: number;
  present: number;
  pto: number;
  halfDay: number;
  sick: number;
  late: number;
  notMarked: number;
};

type TeamData = {
  date: string;
  team: TeamMember[];
  summary: Summary;
};

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; emoji: string; bgColor: string; textColor: string }> = {
  PRESENT: { label: "Present", emoji: "✓", bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-800 dark:text-green-300" },
  REMOTE: { label: "Remote", emoji: "🏠", bgColor: "bg-blue-100 dark:bg-blue-900/30", textColor: "text-blue-800 dark:text-blue-300" },
  PTO: { label: "PTO", emoji: "🌴", bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-800 dark:text-purple-300" },
  HALF_DAY: { label: "Half Day", emoji: "½", bgColor: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-800 dark:text-amber-300" },
  SICK: { label: "Sick", emoji: "🤒", bgColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-800 dark:text-red-300" },
  LATE: { label: "Late", emoji: "⏰", bgColor: "bg-orange-100 dark:bg-orange-900/30", textColor: "text-orange-800 dark:text-orange-300" },
};

const ALL_STATUSES: AttendanceStatus[] = ["PRESENT", "REMOTE", "PTO", "HALF_DAY", "SICK", "LATE"];

function TeamAttendancePage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [reason, setReason] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  useEffect(() => {
    fetchTeamAttendance();
  }, [selectedDate, page, pageSize]);

  // Reset to page 1 when date changes
  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

  async function fetchTeamAttendance() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/attendance/team?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("You don't have permission to view team attendance");
        } else {
          toast.error("Failed to load team attendance");
        }
        return;
      }
      const json = await res.json();
      setData(json.data);
      setPagination(json.data.pagination || null);
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const handleEditClick = (memberId: number) => {
    const member = data?.team.find((m) => m.id === memberId);
    if (member) {
      setEditingMember(memberId);
      setSelectedStatus(member.attendance?.status || null);
      setReason(member.attendance?.notes || "");
      setShowEditModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingMember(null);
    setSelectedStatus(null);
    setReason("");
  };

  async function updateMemberStatus() {
    if (!editingMember || !selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/attendance/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: editingMember, 
          date: selectedDate, 
          status: selectedStatus,
          notes: reason.trim() || null,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        const errorMessage = json?.error?.message || "Failed to update attendance";
        toast.error(errorMessage);
        return;
      }
      
      await fetchTeamAttendance();
      toast.success("Attendance updated successfully");
      handleCloseModal();
    } catch (err: any) {
      console.error("Failed to update attendance:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 dark:bg-gray-900 min-h-screen p-6 text-gray-900 dark:text-white">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View and manage your team&apos;s attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
          />
        </div>
      </header>

      {loading ? (
       <Skeleton className="w-full h-[85vh]" />
      ) : data ? (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <SummaryCard label="Total" value={data.summary.total} />
            <SummaryCard label="Present" value={data.summary.present} variant="success" />
            <SummaryCard label="PTO" value={data.summary.pto} variant="purple" />
            <SummaryCard label="Half Day" value={data.summary.halfDay} variant="warning" />
            <SummaryCard label="Sick" value={data.summary.sick} variant="danger" />
            <SummaryCard label="Late" value={data.summary.late} variant="orange" />
            <SummaryCard 
              label="Not Marked" 
              value={data.summary.notMarked} 
              variant={data.summary.notMarked > 0 ? "muted" : "default"}
            />
          </section>

          <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Venture
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.team.map((member) => {
                    const statusInfo = member.attendance?.status
                      ? STATUS_CONFIG[member.attendance.status]
                      : null;
                    const isEditing = editingMember === member.id;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{member.fullName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {member.role.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {member.ventures.map((v) => v.name).join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {member.attendance?.status && statusInfo ? (
                              <>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                  {statusInfo.emoji} {statusInfo.label}
                                </span>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Marked: {new Date(member.attendance.createdAt).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                  {member.attendance.updatedAt && 
                                    member.attendance.updatedAt !== member.attendance.createdAt && (
                                      <span className="block text-gray-400 dark:text-gray-500">
                                        Updated: {new Date(member.attendance.updatedAt).toLocaleString('en-US', {
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
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500 italic">Not marked</span>
                            )}
                            {member.attendance?.notes && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                Reason: {member.attendance.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleEditClick(member.id)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                          >
                            {member.hasMarkedToday ? "Edit" : "Set Status"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {data.team.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No team members found
              </div>
            )}
          </section>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </div>
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
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Edit Attendance Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Update Attendance</h2>
                <p className="text-sm text-blue-100 mt-1">
                  {data?.team.find((m) => m.id === editingMember)?.fullName}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMemberStatus();
              }}
              className="p-6 space-y-5"
            >
              {/* Status Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                  Attendance Status <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_STATUSES.map((status) => {
                    const info = STATUS_CONFIG[status];
                    const isSelected = selectedStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                          isSelected
                            ? `${info.bgColor} ${info.textColor} border-blue-500 dark:border-blue-400 shadow-md`
                            : "bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500"
                        }`}
                      >
                        <span className="text-lg mr-2">{info.emoji}</span>
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                  Reason for Change
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for this attendance change (optional)"
                  rows={4}
                  className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  This reason will be stored with the attendance record
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedStatus}
                  className="btn"
               >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Attendance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  variant?: "default" | "success" | "warning" | "danger" | "purple" | "orange" | "muted";
};

function SummaryCard({ label, value, variant = "default" }: SummaryCardProps) {
  const colorClasses = {
    default: "text-gray-900 dark:text-white",
    success: "text-green-700 dark:text-green-400",
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-red-700 dark:text-red-400",
    purple: "text-purple-700 dark:text-purple-400",
    orange: "text-orange-700 dark:text-orange-400",
    muted: "text-gray-400 dark:text-gray-500",
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 shadow-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${colorClasses[variant]}`}>{value}</div>
    </div>
  );
}

TeamAttendancePage.title = "Team Attendance";

export default TeamAttendancePage;
