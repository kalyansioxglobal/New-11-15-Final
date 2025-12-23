type AttendanceData = {
  teamSize: number;
  totalPersonDays: number;
  effectivePersonDays: number;
  attendanceRate: number;
  byStatus: {
    present: number;
    remote: number;
    pto: number;
    halfDay: number;
    sick: number;
    late: number;
    notMarked: number;
  };
};

type AttendanceIndicatorProps = {
  attendance: AttendanceData | null;
  compact?: boolean;
};

export default function AttendanceIndicator({ attendance, compact = false }: AttendanceIndicatorProps) {
  if (!attendance) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-xs">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span>No attendance data</span>
      </div>
    );
  }

  const { attendanceRate, effectivePersonDays, totalPersonDays, byStatus } = attendance;
  
  const getColorClass = () => {
    if (attendanceRate >= 90) return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
    if (attendanceRate >= 70) return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
    return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
  };

  const colors = getColorClass();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${colors.bg} ${colors.text} text-xs`}>
        <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span>{attendanceRate}% attendance</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${colors.bg} border-opacity-50`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
          <span className={`font-medium ${colors.text}`}>Team Attendance</span>
        </div>
        <span className={`text-lg font-semibold ${colors.text}`}>{attendanceRate}%</span>
      </div>
      
      <div className="text-xs text-gray-600 mb-2">
        {effectivePersonDays.toFixed(1)} of {totalPersonDays} person-days worked
      </div>
      
      <div className="flex flex-wrap gap-2 text-xs">
        {byStatus.present > 0 && (
          <StatusBadge label="Present" count={byStatus.present} color="green" />
        )}
        {byStatus.remote > 0 && (
          <StatusBadge label="Remote" count={byStatus.remote} color="blue" />
        )}
        {byStatus.pto > 0 && (
          <StatusBadge label="PTO" count={byStatus.pto} color="purple" />
        )}
        {byStatus.halfDay > 0 && (
          <StatusBadge label="Half Day" count={byStatus.halfDay} color="amber" />
        )}
        {byStatus.sick > 0 && (
          <StatusBadge label="Sick" count={byStatus.sick} color="red" />
        )}
        {byStatus.notMarked > 0 && (
          <StatusBadge label="Not Marked" count={byStatus.notMarked} color="gray" />
        )}
      </div>
      
      {byStatus.notMarked > 0 && (
        <div className="mt-2 text-xs text-amber-700 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>Some team members haven&apos;t marked attendance</span>
        </div>
      )}
    </div>
  );
}

type StatusBadgeProps = {
  label: string;
  count: number;
  color: "green" | "blue" | "purple" | "amber" | "red" | "gray";
};

function StatusBadge({ label, count, color }: StatusBadgeProps) {
  const colorClasses = {
    green: "bg-green-200 text-green-800",
    blue: "bg-blue-200 text-blue-800",
    purple: "bg-purple-200 text-purple-800",
    amber: "bg-amber-200 text-amber-800",
    red: "bg-red-200 text-red-800",
    gray: "bg-gray-200 text-gray-600",
  };

  return (
    <span className={`px-1.5 py-0.5 rounded ${colorClasses[color]}`}>
      {label}: {count}
    </span>
  );
}
