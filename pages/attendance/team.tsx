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

  async function updateMemberStatus(userId: number, status: AttendanceStatus) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: selectedDate, status }),
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        // Show the specific error message from the API
        const errorMessage = json?.error?.message || "Failed to update attendance";
        setError(errorMessage);
        return;
      }
      
      await fetchTeamAttendance();
      setEditingMember(null);
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
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-500">Loading team attendance...</p>
        </div>
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
                          {isEditing ? (
                            <div className="flex flex-wrap gap-1">
                              {ALL_STATUSES.map((status) => {
                                const info = STATUS_CONFIG[status];
                                return (
                                  <button
                                    key={status}
                                    onClick={() => updateMemberStatus(member.id, status)}
                                    disabled={saving}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${info.bgColor} ${info.textColor} hover:opacity-80 disabled:opacity-50`}
                                  >
                                    {info.emoji} {info.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : member.attendance?.status && statusInfo ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                              {statusInfo.emoji} {statusInfo.label}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Not marked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <button
                              onClick={() => setEditingMember(null)}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingMember(member.id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              {member.hasMarkedToday ? "Edit" : "Set Status"}
                            </button>
                          )}
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
