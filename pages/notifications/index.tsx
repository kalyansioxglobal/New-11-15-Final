import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

type Notification = {
  id: number;
  type?: string;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: number;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState<Set<number>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const fetchNotifications = async (currentPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        includeRead: "true",
        page: String(currentPage),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        setUnreadCount(data.unreadCount || 0);
        setPagination({
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
        });
      } else {
        toast.error("Failed to load notifications");
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const markAsRead = async (id: number) => {
    // Optimistically update UI immediately - update count FIRST for instant badge update
    setMarkingRead((prev) => new Set(prev).add(id));
    
    // Update unread count immediately before notifications
    setUnreadCount((prev) => Math.max(0, prev - 1));
    
    // Then update notifications
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });

      if (!res.ok) {
        const error = await res.json();
        // Revert optimistic update on error
        setUnreadCount((prev) => prev + 1);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
        );
        toast.error(error.error || "Failed to mark notification as read");
        return;
      }

      const data = await res.json();
      // Update count from response - this ensures accuracy even if optimistic update was slightly off
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
      }
      toast.success("Notification marked as read");
    } catch (e) {
      console.error("Failed to mark notification as read", e);
      // Revert optimistic update on error
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
      );
      toast.error("Failed to mark notification as read");
    } finally {
      setMarkingRead((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) {
      toast("All notifications are already read", { icon: "ℹ️" });
      return;
    }

    // Optimistically update UI immediately - update count to 0 right away
    setMarkingAllRead(true);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });

      if (!res.ok) {
        const error = await res.json();
        // Revert optimistic update on error
        setNotifications((prev) =>
          prev.map((n) =>
            unreadIds.includes(n.id) ? { ...n, isRead: false } : n
          )
        );
        setUnreadCount(unreadIds.length);
        toast.error(error.error || "Failed to mark all as read");
        return;
      }

      const data = await res.json();
      // Update count from response to ensure accuracy
      if (data.unreadCount !== undefined) {
        setUnreadCount(data.unreadCount);
      }
      toast.success("All notifications marked as read");
    } catch (e) {
      console.error("Failed to mark all as read", e);
      // Revert optimistic update on error
      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) ? { ...n, isRead: false } : n
        )
      );
      setUnreadCount(unreadIds.length);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 dark:bg-gray-900 min-h-screen p-6 text-gray-900 dark:text-white">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and manage all your notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div className="px-5 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm font-medium">
              {unreadCount} unread
            </div>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-600"
            >
              {markingAllRead ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Marking...
                </span>
              ) : (
                "Mark All Read"
              )}
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
          >
            Back
          </button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-full h-24" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer ${
                  !n.isRead ? "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white mb-1">
                      {n.title}
                    </div>
                    {n.body && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {n.body}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(n.createdAt)}
                      </div>
                      {n.type && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          {n.type}
                        </span>
                      )}
                    </div>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      disabled={markingRead.has(n.id)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {markingRead.has(n.id) ? (
                        <>
                          <svg className="animate-spin h-3 w-3 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Marking...
                        </>
                      ) : (
                        "Mark as read"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg">
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
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <svg className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No notifications found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}

NotificationsPage.title = "Notifications";
