import { useEffect, useState } from "react";
import Link from "next/link";

type TimelineSeverity = "info" | "warning" | "critical";

interface OwnerTimelineItem {
  id: string;
  type: string;
  severity: TimelineSeverity;
  date: string;
  ventureId?: number;
  ventureName?: string;
  title: string;
  description?: string;
  url?: string;
}

export default function OwnerTimeline() {
  const [items, setItems] = useState<OwnerTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/owner/timeline")
      .then((r) => {
        if (r.status === 401) {
          setError("unauthorized");
          return { items: [] as OwnerTimelineItem[] };
        }
        if (r.status === 403) {
          setError("forbidden");
          return { items: [] as OwnerTimelineItem[] };
        }
        return r.json();
      })
      .then((d) => setItems(d.items || []))
      .catch(() => setError("error"))
      .finally(() => setLoading(false));
  }, []);

  const badgeClass = (severity: TimelineSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const iconForType = (type: string) => {
    if (type.startsWith("POLICY")) return "📄";
    if (type === "TASK_OVERDUE") return "⏰";
    if (type.startsWith("VENTURE")) return "🏢";
    if (type.startsWith("FREIGHT")) return "🚚";
    if (type.startsWith("HOTEL")) return "🏨";
    return "•";
  };

  const Wrapper: React.FC<{ item: OwnerTimelineItem; children: React.ReactNode }> =
    ({ item, children }) => {
      if (item.url) {
        return (
          <Link href={item.url} className="block hover:bg-gray-50 rounded-md px-1 -mx-1">
            {children}
          </Link>
        );
      }
      return <>{children}</>;
    };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Owner Timeline</h2>
        <p className="text-sm text-gray-500">Loading alerts…</p>
      </div>
    );
  }

  if (error === "unauthorized" || error === "forbidden") {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Owner Timeline</h2>
        <p className="text-sm text-gray-500">
          Sign in as CEO or Admin to view the timeline.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Owner Timeline</h2>
        <p className="text-sm text-red-500">Failed to load timeline.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm max-h-[600px] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-3">Owner Timeline</h2>

      {items.length === 0 && (
        <p className="text-sm text-gray-500">
          No alerts right now. All ventures are stable.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 text-sm">
            <div className="mt-1 text-lg">{iconForType(item.type)}</div>
            <Wrapper item={item}>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {item.title}
                    {item.ventureName && (
                      <span className="text-xs text-gray-500 ml-1">
                        · {item.ventureName}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide ${badgeClass(
                      item.severity
                    )}`}
                  >
                    {item.type.replace(/_/g, " ")}
                  </span>
                </div>
                {item.description && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    {item.description}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(item.date).toLocaleString()}
                </div>
              </div>
            </Wrapper>
          </li>
        ))}
      </ul>
    </div>
  );
}
