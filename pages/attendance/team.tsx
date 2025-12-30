import { Skeleton } from "@/components/ui/Skeleton";
import { useState, useEffect } from "react";

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
  PRESENT: { label: "Present", emoji: "✓", bgColor: "bg-green-100", textColor: "text-green-800" },
  REMOTE: { label: "Remote", emoji: "🏠", bgColor: "bg-blue-100", textColor: "text-blue-800" },
  PTO: { label: "PTO", emoji: "🌴", bgColor: "bg-purple-100", textColor: "text-purple-800" },
  HALF_DAY: { label: "Half Day", emoji: "½", bgColor: "bg-amber-100", textColor: "text-amber-800" },
  SICK: { label: "Sick", emoji: "🤒", bgColor: "bg-red-100", textColor: "text-red-800" },
  LATE: { label: "Late", emoji: "⏰", bgColor: "bg-orange-100", textColor: "text-orange-800" },
};

const ALL_STATUSES: AttendanceStatus[] = ["PRESENT", "REMOTE", "PTO", "HALF_DAY", "SICK", "LATE"];

function TeamAttendancePage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    fetchTeamAttendance();
  }, [selectedDate]);

  async function fetchTeamAttendance() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/attendance/team?date=${selectedDate}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("You don't have permission to view team attendance");
        }
        throw new Error("Failed to load team attendance");
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      setError("Please select a status");
      return;
    }

    setSaving(true);
    setError(null);
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
        // Show the specific error message from the API
        const errorMessage = json?.error?.message || "Failed to update attendance";
        setError(errorMessage);
        return;
      }
      
      await fetchTeamAttendance();
      handleCloseModal();
    } catch (err: any) {
      console.error("Failed to update attendance:", err);
      setError(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Show full-page error only for access/permission errors
  if (error && (error.includes("permission") || error.includes("Access Denied") || error.includes("FORBIDDEN"))) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your team&apos;s attendance</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venture
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.team.map((member) => {
                    const statusInfo = member.attendance?.status
                      ? STATUS_CONFIG[member.attendance.status]
                      : null;
                    const isEditing = editingMember === member.id;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{member.fullName}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {member.role.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {member.ventures.map((v) => v.name).join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {member.attendance?.status && statusInfo ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                {statusInfo.emoji} {statusInfo.label}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Not marked</span>
                            )}
                            {member.attendance?.notes && (
                              <div className="text-xs text-gray-500 mt-1 italic">
                                Reason: {member.attendance.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleEditClick(member.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
              <div className="p-8 text-center text-gray-500">
                No team members found
              </div>
            )}
          </section>
        </>
      ) : null}

      {/* Edit Attendance Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
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
                            ? `${info.bgColor} ${info.textColor} border-blue-500 shadow-md`
                            : "bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-blue-300"
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

              {/* Error Display */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

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
                  className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
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
    default: "text-gray-900",
    success: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    purple: "text-purple-700",
    orange: "text-orange-700",
    muted: "text-gray-400",
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${colorClasses[variant]}`}>{value}</div>
    </div>
  );
}

TeamAttendancePage.title = "Team Attendance";

export default TeamAttendancePage;
