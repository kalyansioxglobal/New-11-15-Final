import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useTestMode } from "@/contexts/TestModeContext";
import { Skeleton } from "./ui/Skeleton";
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

export default function NotificationsBell() {
  const router = useRouter();
  const { testMode } = useTestMode();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sseConnected, setSseConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sseConnectedRef = useRef(false);

  const fetchNotifications = useCallback(async (includeRead = false) => {
    try {
      const params = new URLSearchParams({
        includeRead: includeRead ? "true" : "false",
        page: "1",
        pageSize: "10",
      });
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Only update if we're fetching unread notifications (for the dropdown)
        // This prevents overwriting read notifications when polling
        if (!includeRead) {
          setNotifications(data.items || []);
        }
        setUnreadCount(data.unreadCount || 0);
        return data;
      }
    } catch (e) {
      console.error("Failed to fetch notifications", e);
      if (!includeRead) {
        toast.error("Failed to load notifications");
      }
    }
  }, []);

  const connectSSE = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        setSseConnected(true);
        sseConnectedRef.current = true;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        // Continue polling every 60 seconds as backup when SSE is connected
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setInterval(() => {
          fetchNotifications(false);
        }, 60000);
      });

      eventSource.addEventListener("new_notification", (event: MessageEvent) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          setNotifications((prev) => {
            const exists = prev.some((n) => n.id === notification.id);
            if (exists) return prev;
            return [notification, ...prev].slice(0, 10);
          });
          setUnreadCount((prev) => prev + 1);
        } catch (error) {
          console.error("[Notifications SSE] Failed to parse notification:", error);
        }
      });

      eventSource.addEventListener("unread_count", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          setUnreadCount(data.unreadCount || 0);
        } catch (error) {
          console.error("[Notifications SSE] Failed to parse unread count:", error);
        }
      });

      eventSource.onerror = () => {
        setSseConnected(false);
        sseConnectedRef.current = false;
        eventSource.close();
        
        // Fallback to polling if SSE fails
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setInterval(() => {
          fetchNotifications(false);
        }, 60000);
        
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 5000);
      };
    } catch (error) {
      console.error("[Notifications SSE] Failed to connect:", error);
      setSseConnected(false);
      sseConnectedRef.current = false;
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications(false);
      }, 60000);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    // Initial fetch
    fetchNotifications().finally(() => setLoading(false));
    
    // Start polling immediately as backup (every 60 seconds)
    pollingIntervalRef.current = setInterval(() => {
      fetchNotifications(false);
    }, 60000);
    
    // Try SSE (will adjust polling rate if successful)
    connectSSE();
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [testMode, fetchNotifications, connectSSE]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to mark notification as read");
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      toast.success("Notification marked as read");
    } catch (e) {
      console.error("Failed to mark notification as read", e);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to mark all as read");
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setOpen(false);
      toast.success("All notifications marked as read");
    } catch (e) {
      console.error("Failed to mark all as read", e);
      toast.error("Failed to mark all as read");
    }
  };

  const handleViewAllClick = () => {
    router.push("/notifications");
    setOpen(false);
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
    <div className="relative text-xs" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5 text-gray-600 dark:text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50 text-xs max-h-96 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              Notifications
            </span>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={handleViewAllClick}
                className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-400">
               <Skeleton className="w-full h-5" />
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${
                    !n.isRead ? "bg-blue-50/50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        {formatTime(n.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-400">
                <svg className="h-8 w-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
