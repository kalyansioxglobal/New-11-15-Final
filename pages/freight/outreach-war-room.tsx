import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { PageWithLayout } from "@/types/page";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface LoadSummary {
  id: number;
  reference: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  pickupDate: string | null;
  equipmentType: string | null;
  loadStatus: string;
  createdAt: string;
  ventureId: number | null;
  venture: { name: string } | null;
  minutesSincePosted: number;
  replyCount: number;
  lastOutreach: {
    channel: string;
    status: string;
    recipientCount: number;
    at: string;
  } | null;
}

interface CarrierForOutreach {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  matchScore: number;
  matchReasons: string[];
}

interface OutreachHistoryItem {
  id: number;
  channel: string;
  subject: string | null;
  status: string;
  provider: string;
  createdAt: string;
  _count: { recipients: number };
}

interface ReplyItem {
  id: number;
  direction: string;
  body: string;
  createdAt: string;
}

interface ConversationItem {
  id: number;
  channel: string;
  lastMessageAt: string;
  carrier: { id: number; name: string; email: string | null; phone: string | null };
  replies: ReplyItem[];
}

interface AttributionData {
  id: number;
  channel: string | null;
  timeToFirstReplyMinutes: number | null;
  timeToCoverageMinutes: number | null;
  margin: string | null;
  carrierId: number | null;
  createdAt: string;
  carrier: { id: number; name: string } | null;
}

interface SelectedLoad {
  id: number;
  reference: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  pickupDate: string | null;
  equipmentType: string | null;
  notes: string | null;
  venture: { id: number; name: string } | null;
  carrier: { id: number; name: string } | null;
}

const OutreachWarRoomPage: PageWithLayout = () => {
  const router = useRouter();
  const loadId = router.query.loadId ? parseInt(router.query.loadId as string, 10) : null;

  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<SelectedLoad | null>(null);
  const [recommendedCarriers, setRecommendedCarriers] = useState<CarrierForOutreach[]>([]);
  const [outreachHistory, setOutreachHistory] = useState<OutreachHistoryItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [attribution, setAttribution] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"recommended" | "replies" | "history" | "roi">("recommended");
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [replyLoading, setReplyLoading] = useState<number | null>(null);
  const [awardLoading, setAwardLoading] = useState(false);
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<number[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewChannel, setPreviewChannel] = useState<"sms" | "email">("email");
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = loadId
        ? `/api/freight/outreach-war-room?loadId=${loadId}`
        : `/api/freight/outreach-war-room`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load data");
      const data = await res.json();
      setLoads(data.loads || []);
      setSelectedLoad(data.selectedLoad || null);
      setRecommendedCarriers(data.recommendedCarriers || []);
      setOutreachHistory(data.outreachHistory || []);
      setConversations(data.conversations || []);
      setAttribution(data.attribution || null);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectLoad = (id: number) => {
    router.push(`/freight/outreach-war-room?loadId=${id}`, undefined, { shallow: true });
  };

  const toggleCarrier = (carrierId: number) => {
    setSelectedCarrierIds((prev) =>
      prev.includes(carrierId) ? prev.filter((id) => id !== carrierId) : [...prev, carrierId]
    );
  };

  const selectTopN = (n: number) => {
    const topIds = recommendedCarriers.slice(0, n).map((c) => c.id);
    setSelectedCarrierIds(topIds);
  };

  const handlePreview = async (channel: "sms" | "email", n: number) => {
    if (!loadId) return;
    setPreviewChannel(channel);
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await fetch("/api/freight/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId,
          channel,
          n,
          recipientCarrierIds: selectedCarrierIds.length > 0 ? selectedCarrierIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreviewData(data);
    } catch (err: any) {
      setError(err.message);
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!previewData || !loadId) return;
    setSendLoading(true);
    try {
      const res = await fetch("/api/freight/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId,
          channel: previewChannel,
          subject: previewData.draftSubject,
          body: previewData.draftBody,
          recipientCarrierIds: previewData.recipients.map((r: any) => r.carrierId),
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setShowPreview(false);
      setPreviewData(null);
      setSelectedCarrierIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendLoading(false);
    }
  };

  const handleReply = async (conversationId: number, channel: string) => {
    const text = replyTexts[conversationId] || "";
    if (!text.trim() || !loadId) return;
    setReplyLoading(conversationId);
    try {
      const res = await fetch("/api/freight/outreach/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          loadId,
          channel,
          body: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply failed");
      setReplyTexts((prev) => ({ ...prev, [conversationId]: "" }));
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Reply failed";
      setError(errMsg);
    } finally {
      setReplyLoading(null);
    }
  };

  const handleAward = async (carrierId: number) => {
    if (!loadId) return;
    setAwardLoading(true);
    try {
      const res = await fetch("/api/freight/outreach/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadId, carrierId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Award failed");
      fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Award failed";
      setError(errMsg);
    } finally {
      setAwardLoading(false);
    }
  };

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days}d ${hours}h`;
  };

  const formatLane = (load: LoadSummary | SelectedLoad) => {
    const pickup = [load.pickupCity, load.pickupState].filter(Boolean).join(", ") || "Origin";
    const drop = [load.dropCity, load.dropState].filter(Boolean).join(", ") || "Destination";
    return `${pickup} → ${drop}`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50 dark:bg-gray-900" data-testid="war-room">
      {/* Panel A: Load Feed */}
      <div className="w-80 border-r dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col" data-testid="war-room-load-feed">
        <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Loads</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{loads.length} loads</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-3 text-xs text-gray-500">Loading...</div>}
          {loads.map((load) => (
            <div
              key={load.id}
              onClick={() => selectLoad(load.id)}
              className={`p-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                loadId === load.id ? "bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {load.reference || `#${load.id}`}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {formatTime(load.minutesSincePosted)} ago
                </span>
              </div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 truncate">{formatLane(load)}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    load.loadStatus === "OPEN"
                      ? "bg-yellow-500 text-white"
                      : load.loadStatus === "BOOKED"
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200"
                  }`}
                >
                  {load.loadStatus}
                </span>
                {load.lastOutreach && (
                  <span className="text-[10px] text-gray-500">
                    {load.lastOutreach.channel.toUpperCase()} ({load.lastOutreach.recipientCount})
                  </span>
                )}
                {load.replyCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {load.replyCount} replies
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel B: Load Control Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLoad ? (
          <>
            <div className="p-4 border-b bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedLoad.reference || `Load #${selectedLoad.id}`}
                  </h2>
                  <p className="text-sm text-gray-600 mt-0.5">{formatLane(selectedLoad)}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {selectedLoad.venture?.name || "No Venture"}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3 text-xs">
                <div>
                  <span className="text-gray-500">Equipment:</span>{" "}
                  <span className="font-medium">{selectedLoad.equipmentType || "TBD"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pickup:</span>{" "}
                  <span className="font-medium">
                    {selectedLoad.pickupDate
                      ? new Date(selectedLoad.pickupDate).toLocaleDateString()
                      : "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Carrier:</span>{" "}
                  <span className="font-medium">{selectedLoad.carrier?.name || "None"}</span>
                </div>
              </div>
              {selectedLoad.notes && (
                <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                  {selectedLoad.notes}
                </p>
              )}
            </div>

            <div className="p-3 border-b bg-gray-50 flex items-center gap-2">
              <button
                onClick={() => handlePreview("sms", 15)}
                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                data-testid="btn-preview-sms"
              >
                Text Top 15
              </button>
              <button
                onClick={() => handlePreview("email", 25)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                data-testid="btn-preview-email"
              >
                Email Top 25
              </button>
              <button
                onClick={() => handlePreview("email", 50)}
                className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Expand Next 50
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase mb-2">
                Outreach Timeline
              </h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-gray-400 mt-1" />
                  <div>
                    <span className="font-medium">Load posted</span>
                    <span className="text-gray-500 ml-2">
                      {new Date(selectedLoad.pickupDate || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {outreachHistory.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2 text-xs">
                    <div
                      className={`w-2 h-2 rounded-full mt-1 ${
                        msg.status === "SENT"
                          ? "bg-green-500"
                          : msg.status === "PARTIAL"
                          ? "bg-yellow-500"
                          : msg.status === "DRY_RUN"
                          ? "bg-purple-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <span className="font-medium">
                        {msg.channel === "sms" ? "SMS" : "Email"} sent ({msg._count.recipients})
                      </span>
                      <span className="text-gray-500 ml-2">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                          msg.status === "SENT"
                            ? "bg-green-100 text-green-800"
                            : msg.status === "DRY_RUN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {msg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Select a load from the left panel
          </div>
        )}
      </div>

      {/* Panel C: Tabs */}
      <div className="w-96 border-l bg-white overflow-hidden flex flex-col">
        <div className="flex border-b">
          {(["recommended", "replies", "history", "roi"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-medium relative ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "recommended"
                ? "Carriers"
                : tab === "replies"
                ? "Replies"
                : tab === "history"
                ? "History"
                : "ROI"}
              {tab === "replies" && conversations.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {conversations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === "recommended" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {selectedCarrierIds.length} selected
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => selectTopN(15)}
                    className="text-[10px] px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Top 15
                  </button>
                  <button
                    onClick={() => selectTopN(25)}
                    className="text-[10px] px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Top 25
                  </button>
                </div>
              </div>
              {recommendedCarriers.map((carrier) => (
                <div
                  key={carrier.id}
                  className="flex items-start gap-2 p-2 border rounded mb-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedCarrierIds.includes(carrier.id)}
                    onChange={() => toggleCarrier(carrier.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {carrier.name}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {carrier.matchReasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {carrier.email && <span className="mr-2">{carrier.email}</span>}
                      {carrier.phone && <span>{carrier.phone}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {recommendedCarriers.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-4">
                  Select a load to see recommended carriers
                </div>
              )}
            </>
          )}

          {activeTab === "history" && (
            <>
              {outreachHistory.map((msg) => (
                <div key={msg.id} className="p-2 border rounded mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">
                      {msg.channel === "sms" ? "SMS" : "Email"}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        msg.status === "SENT"
                          ? "bg-green-100 text-green-800"
                          : msg.status === "DRY_RUN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                  {msg.subject && (
                    <div className="text-[11px] text-gray-600 mt-1 truncate">{msg.subject}</div>
                  )}
                  <div className="text-[10px] text-gray-500 mt-1">
                    {msg._count.recipients} recipients • {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {outreachHistory.length === 0 && (
                <div className="text-xs text-gray-500 text-center py-4">
                  No outreach history for this load
                </div>
              )}
            </>
          )}

          {activeTab === "replies" && (
            <>
              {conversations.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No carrier replies yet for this load
                </div>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} className="border rounded mb-3">
                    <div className="p-2 bg-gray-50 border-b flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium">{conv.carrier.name}</span>
                        <span className="text-[10px] text-gray-500 ml-2">
                          {conv.channel.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAward(conv.carrier.id)}
                        disabled={awardLoading || selectedLoad?.carrier !== null}
                        className="text-[10px] px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Award
                      </button>
                    </div>
                    <div className="p-2 max-h-40 overflow-y-auto space-y-2">
                      {conv.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`text-xs p-2 rounded ${
                            reply.direction === "inbound"
                              ? "bg-blue-50 text-blue-900"
                              : "bg-gray-100 text-gray-700 ml-4"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-[10px]">
                              {reply.direction === "inbound" ? conv.carrier.name : "You"}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(reply.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{reply.body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 border-t">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyTexts[conv.id] || ""}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                          placeholder="Type a reply..."
                          className="flex-1 text-xs border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => handleReply(conv.id, conv.channel)}
                          disabled={replyLoading === conv.id || !(replyTexts[conv.id] || "").trim()}
                          className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {replyLoading === conv.id ? "..." : "Send"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === "roi" && (
            <>
              {attribution ? (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2">Outreach Attribution</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-gray-500">Channel</div>
                        <div className="text-sm font-medium">{attribution.channel?.toUpperCase() || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500">Time to First Reply</div>
                        <div className="text-sm font-medium">{formatMinutes(attribution.timeToFirstReplyMinutes)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500">Time to Coverage</div>
                        <div className="text-sm font-medium">{formatMinutes(attribution.timeToCoverageMinutes)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500">Margin</div>
                        <div className="text-sm font-medium">
                          {attribution.margin ? `$${Number(attribution.margin).toLocaleString()}` : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                  {attribution.carrier && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-[10px] text-green-600">Awarded Carrier</div>
                      <div className="text-sm font-medium text-green-800">{attribution.carrier.name}</div>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-500">
                    Tracking started: {new Date(attribution.createdAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  No attribution data yet. Send outreach to start tracking ROI.
                </div>
              )}

              <div className="mt-4 p-3 border rounded">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Outreach Summary</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Messages Sent</span>
                    <span className="font-medium">{outreachHistory.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Conversations</span>
                    <span className="font-medium">{conversations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Replies</span>
                    <span className="font-medium">
                      {conversations.reduce((sum, c) => sum + c.replies.filter(r => r.direction === "inbound").length, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="outreach-preview">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {previewChannel === "sms" ? "SMS" : "Email"} Preview
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {previewLoading ? (
                <div className="text-center py-8 text-gray-500">Loading preview...</div>
              ) : previewData ? (
                <>
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">From: {previewData.ventureName}</div>
                    <div className="text-xs text-gray-500 mb-1">Provider: {previewData.provider}</div>
                    <div className="text-xs text-gray-500">
                      Recipients: {previewData.recipients?.length || 0}
                    </div>
                  </div>

                  {previewData.warnings?.length > 0 && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      {previewData.warnings.join(", ")}
                    </div>
                  )}

                  {previewChannel === "email" && previewData.draftSubject && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">Subject</div>
                      <div className="p-2 bg-gray-50 rounded text-sm">{previewData.draftSubject}</div>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-700 mb-1">Message</div>
                    <div
                      className="p-3 bg-gray-50 rounded text-sm"
                      dangerouslySetInnerHTML={{
                        __html: previewData.draftBody || "",
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Recipients ({previewData.recipients?.length || 0})
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded">
                      {previewData.recipients?.map((r: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-2 py-1 border-b last:border-b-0 text-xs"
                        >
                          <span>{r.name}</span>
                          <span className="text-gray-500">{r.contact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-red-500">Failed to load preview</div>
              )}
            </div>
            <div className="p-4 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewData(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sendLoading || !previewData}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                data-testid="btn-send-confirm"
              >
                {sendLoading ? "Sending..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

OutreachWarRoomPage.title = "Outreach War Room";

export default OutreachWarRoomPage;
