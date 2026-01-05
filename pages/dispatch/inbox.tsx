import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

type DispatchNotification = {
  type: "NEW_MESSAGE" | "CONVERSATION_CLAIMED" | "CONVERSATION_RELEASED" | "NEW_CONVERSATION";
  conversationId: number;
  message?: string;
  fromAddress?: string;
  channel?: string;
  dispatcherId?: number;
  dispatcherName?: string;
};

type Message = {
  body: string;
  createdAt: string;
  direction: string;
};

type Conversation = {
  id: number;
  channel: "EMAIL" | "SMS";
  status: "OPEN" | "CLOSED" | "ARCHIVED";
  subject: string | null;
  participantType: string;
  externalAddress: string;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  driver: { id: number; firstName: string; lastName: string; phone: string; email: string | null } | null;
  carrier: { id: number; name: string; phone: string | null; email: string | null } | null;
  load: { id: number; referenceNumber: string; status: string } | null;
  lastMessage: Message | null;
  participantName: string;
  assignedDispatcherId: number | null;
  assignmentStatus: string;
  assignedDispatcherName?: string;
};

type ConversationDetail = {
  id: number;
  channel: string;
  status: string;
  subject: string | null;
  externalAddress: string;
  assignedDispatcherId: number | null;
  assignmentStatus: string;
  assignedDispatcherName?: string;
  driver: { id: number; firstName: string; lastName: string; phone: string; email: string | null; status: string } | null;
  carrier: { id: number; name: string; phone: string | null; email: string | null } | null;
  dispatchLoad: { id: number; referenceNumber: string; status: string; pickupCity: string; pickupState: string; deliveryCity: string; deliveryState: string } | null;
  messages: Array<{
    id: number;
    direction: string;
    channel: string;
    fromAddress: string;
    toAddress: string;
    subject: string | null;
    body: string;
    status: string;
    createdAt: string;
    handledById?: number;
  }>;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function DispatchInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filter, setFilter] = useState({ status: "all", channel: "all", search: "" });
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const selectedConversationRef = useRef<ConversationDetail | null>(null);
  const filterRef = useRef(filter);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  selectedConversationRef.current = selectedConversation;
  filterRef.current = filter;

  const refreshConversations = useCallback(async () => {
    const currentFilter = filterRef.current;
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        ...(currentFilter.status !== "all" && { status: currentFilter.status }),
        ...(currentFilter.channel !== "all" && { channel: currentFilter.channel }),
        ...(currentFilter.search && { search: currentFilter.search }),
      });
      const res = await fetch(`/api/dispatch/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to refresh conversations:", error);
    }
  }, []);

  const refreshSelectedConversation = useCallback(async (conversationId: number) => {
    try {
      const res = await fetch(`/api/dispatch/conversations/${conversationId}`);
      const data = await res.json();
      setSelectedConversation(data.conversation);
    } catch (error) {
      console.error("Failed to refresh conversation:", error);
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/dispatch/notifications/stream");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setConnected(true);
    });

    eventSource.addEventListener("dispatch_notification", (event) => {
      try {
        const data = JSON.parse(event.data) as DispatchNotification;
        if (data.type === "NEW_MESSAGE" || data.type === "NEW_CONVERSATION") {
          refreshConversations();
          if (selectedConversationRef.current?.id === data.conversationId) {
            refreshSelectedConversation(data.conversationId);
          }
          setNotification({
            message: `New ${data.channel || "message"} from ${data.fromAddress || "unknown"}`,
            type: "info",
          });
          setTimeout(() => setNotification(null), 5000);
        } else if (data.type === "CONVERSATION_CLAIMED" || data.type === "CONVERSATION_RELEASED") {
          refreshConversations();
          if (selectedConversationRef.current?.id === data.conversationId) {
            refreshSelectedConversation(data.conversationId);
          }
        }
      } catch (error) {
        console.error("Failed to parse notification:", error);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, 5000);
    };

    return eventSource;
  }, [refreshConversations, refreshSelectedConversation]);

  useEffect(() => {
    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connectSSE]);

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  async function fetchConversations(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(filter.status !== "all" && { status: filter.status }),
        ...(filter.channel !== "all" && { channel: filter.channel }),
        ...(filter.search && { search: filter.search }),
      });
      const res = await fetch(`/api/dispatch/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function selectConversation(id: number) {
    setLoadingDetail(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/dispatch/conversations/${id}`);
      const data = await res.json();
      setSelectedConversation(data.conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function claimConversation() {
    if (!selectedConversation) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/dispatch/conversations/${selectedConversation.id}/claim`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedConversation((prev) => prev ? {
          ...prev,
          assignedDispatcherId: data.conversation.assignedDispatcherId,
          assignmentStatus: data.conversation.assignmentStatus,
        } : null);
        fetchConversations();
      } else {
        alert(data.error || "Failed to claim conversation");
      }
    } catch (error) {
      console.error("Failed to claim conversation:", error);
    } finally {
      setClaiming(false);
    }
  }

  async function releaseConversation() {
    if (!selectedConversation) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/dispatch/conversations/${selectedConversation.id}/release`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedConversation((prev) => prev ? {
          ...prev,
          assignedDispatcherId: null,
          assignmentStatus: "UNASSIGNED",
        } : null);
        fetchConversations();
      } else {
        alert(data.error || "Failed to release conversation");
      }
    } catch (error) {
      console.error("Failed to release conversation:", error);
    } finally {
      setClaiming(false);
    }
  }

  async function sendReply() {
    if (!selectedConversation || !replyText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/dispatch/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          body: replyText.trim(),
        }),
      });
      if (res.ok) {
        setReplyText("");
        await selectConversation(selectedConversation.id);
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setSendError("This conversation is claimed by another dispatcher. Claim it first to reply.");
        } else {
          setSendError(data.error || "Failed to send message");
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: string) {
    if (!selectedConversation) return;
    try {
      await fetch(`/api/dispatch/conversations/${selectedConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSelectedConversation((prev) => prev ? { ...prev, status } : null);
      fetchConversations();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  const isClaimed = selectedConversation?.assignmentStatus === "CLAIMED";

  return (
    <>
      <Head>
        <title>Dispatch Inbox | Communication Center</title>
      </Head>

      <div className="h-[calc(100vh-120px)] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dispatch Inbox</h1>
            <p className="text-sm text-gray-500">
              Unified email and SMS conversations with drivers and carriers
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} title={connected ? "Connected" : "Disconnected"} />
            <Link
              href="/dispatch/drivers"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Drivers
            </Link>
            <Link
              href="/dispatch/loads"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Loads
            </Link>
            <Link
              href="/dispatch/settlements"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Settlements
            </Link>
            <Link
              href="/dispatch/settings"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Settings
            </Link>
          </div>
        </header>

        {notification && (
          <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-white/80 hover:text-white"
            >
              x
            </button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-3 border-b border-gray-200 space-y-2">
              <input
                type="text"
                placeholder="Search conversations..."
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <select
                  value={filter.status}
                  onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="all">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select
                  value={filter.channel}
                  onChange={(e) => setFilter((f) => ({ ...f, channel: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="all">All Channels</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <Skeleton className="w-full h-[85vh]" />
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No conversations found</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv.id)}
                    className={`w-full p-3 text-left border-b border-gray-200 hover:bg-white transition ${
                      selectedConversation?.id === conv.id ? "bg-white ring-2 ring-blue-500 ring-inset" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {conv.participantName}
                      </span>
                      <div className="flex gap-1">
                        {conv.assignmentStatus === "CLAIMED" && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                            Claimed
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          conv.channel === "SMS" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {conv.channel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 truncate">
                        {conv.externalAddress}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium text-white bg-red-500 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="mt-1 text-sm text-gray-600 truncate">
                        {conv.lastMessage.direction === "OUTBOUND" ? "You: " : ""}
                        {conv.lastMessage.body.substring(0, 50)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${
                        conv.status === "OPEN" ? "text-green-600" : "text-gray-400"
                      }`}>
                        {conv.status}
                      </span>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-400">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="p-2 border-t border-gray-200 flex justify-center gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchConversations(pagination.page - 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchConversations(pagination.page + 1)}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </aside>

          <main className="flex-1 flex flex-col bg-white">
            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Loading conversation...
              </div>
            ) : selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        {selectedConversation.driver
                          ? `${selectedConversation.driver.firstName} ${selectedConversation.driver.lastName}`
                          : selectedConversation.carrier?.name || "Unknown"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedConversation.externalAddress}
                        {selectedConversation.dispatchLoad && (
                          <span className="ml-2">
                            | Load: {selectedConversation.dispatchLoad.referenceNumber}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {isClaimed ? (
                        <button
                          onClick={releaseConversation}
                          disabled={claiming}
                          className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50"
                        >
                          {claiming ? "..." : "Release"}
                        </button>
                      ) : (
                        <button
                          onClick={claimConversation}
                          disabled={claiming}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {claiming ? "..." : "Claim"}
                        </button>
                      )}
                      <select
                        value={selectedConversation.status}
                        onChange={(e) => updateStatus(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                      >
                        <option value="OPEN">Open</option>
                        <option value="CLOSED">Closed</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>
                  {isClaimed && (
                    <div className="mt-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                      This conversation is claimed{selectedConversation.assignedDispatcherName && ` by ${selectedConversation.assignedDispatcherName}`}
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.direction === "OUTBOUND"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        {msg.subject && (
                          <p className="text-xs font-medium mb-1 opacity-75">
                            {msg.subject}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className={`text-xs mt-1 ${
                          msg.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"
                        }`}>
                          {new Date(msg.createdAt).toLocaleString()}
                          {msg.status === "FAILED" && (
                            <span className="ml-2 text-red-400">Failed</span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-200">
                  {sendError && (
                    <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {sendError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Send ${selectedConversation.channel} reply...`}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">📬</div>
                  <p className="text-lg">Select a conversation to view messages</p>
                  <p className="text-sm mt-2">
                    Incoming SMS and emails from drivers will appear here
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default DispatchInboxPage;
