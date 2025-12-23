import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

interface QuarantineItem {
  id: number;
  channel: string;
  reason: string;
  status: string;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  body: string;
  externalId: string | null;
  notes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: { id: number; fullName: string | null; email: string } | null;
  attachedLoad: { id: number; reference: string | null } | null;
  attachedCarrier: { id: number; name: string; mcNumber: string | null } | null;
}

export default function QuarantinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QuarantineItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({ channel: "", status: "PENDING" });
  const [resolving, setResolving] = useState(false);
  const [loadIdInput, setLoadIdInput] = useState("");
  const [carrierIdInput, setCarrierIdInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const userRole = (session?.user as { role?: string } | undefined)?.role;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.channel) params.set("channel", filter.channel);
    if (filter.status) params.set("status", filter.status);
    
    const res = await fetch(`/api/admin/quarantine?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!["CEO", "ADMIN", "SUPER_ADMIN"].includes(userRole || "")) {
      router.push("/");
      return;
    }
    fetchItems();
  }, [session, status, router, userRole, fetchItems]);

  const handleResolve = async (action: string) => {
    if (!selectedItem) return;
    setResolving(true);

    const body: Record<string, unknown> = { action };
    if (action === "ATTACH_LOAD" && loadIdInput) {
      body.loadId = parseInt(loadIdInput, 10);
    }
    if (action === "ATTACH_CARRIER" && carrierIdInput) {
      body.carrierId = parseInt(carrierIdInput, 10);
    }
    if (notesInput) {
      body.notes = notesInput;
    }

    const res = await fetch(`/api/admin/quarantine/${selectedItem.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShowModal(false);
      setSelectedItem(null);
      setLoadIdInput("");
      setCarrierIdInput("");
      setNotesInput("");
      fetchItems();
    } else {
      const err = await res.json();
      alert(`Failed: ${err.error}`);
    }
    setResolving(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="p-6">Loading...</div>
    );
  }

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Webhook Quarantine</h1>
        <p className="text-gray-600 mb-6">
          Review unmatched or unverified inbound messages from SMS and Email webhooks.
        </p>

        <div className="flex gap-4 mb-4">
          <select
            value={filter.channel}
            onChange={(e) => setFilter({ ...filter, channel: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ATTACHED">Attached</option>
            <option value="DISCARDED">Discarded</option>
          </select>
          <span className="text-gray-500 self-center">Total: {total}</span>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{item.id}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.channel === "sms" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                    }`}>
                      {item.channel.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-xs">{item.fromAddress}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-orange-600">{item.reason}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      item.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                      item.status === "ATTACHED" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => { setSelectedItem(item); setShowModal(true); }}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No quarantined items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Quarantine Item #{selectedItem.id}</h2>
                <button
                  onClick={() => { setShowModal(false); setSelectedItem(null); }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Channel</label>
                  <p className="font-semibold">{selectedItem.channel.toUpperCase()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <p className="font-semibold">{selectedItem.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">From</label>
                  <p className="font-mono text-sm">{selectedItem.fromAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">To</label>
                  <p className="font-mono text-sm">{selectedItem.toAddress}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Reason</label>
                  <p className="text-orange-600 font-semibold">{selectedItem.reason}</p>
                </div>
                {selectedItem.subject && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-500">Subject</label>
                    <p>{selectedItem.subject}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">Body</label>
                  <pre className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedItem.body}
                  </pre>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p>{new Date(selectedItem.createdAt).toLocaleString()}</p>
                </div>
                {selectedItem.externalId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">External ID</label>
                    <p className="font-mono text-xs">{selectedItem.externalId}</p>
                  </div>
                )}
              </div>

              {selectedItem.attachedLoad && (
                <div className="mb-4 p-3 bg-blue-50 rounded">
                  <strong>Attached Load:</strong> #{selectedItem.attachedLoad.id} - {selectedItem.attachedLoad.reference}
                </div>
              )}
              {selectedItem.attachedCarrier && (
                <div className="mb-4 p-3 bg-green-50 rounded">
                  <strong>Attached Carrier:</strong> {selectedItem.attachedCarrier.name} (MC#{selectedItem.attachedCarrier.mcNumber})
                </div>
              )}
              {selectedItem.resolvedBy && (
                <div className="mb-4 p-3 bg-gray-50 rounded">
                  <strong>Resolved by:</strong> {selectedItem.resolvedBy.fullName || selectedItem.resolvedBy.email} on {selectedItem.resolvedAt ? new Date(selectedItem.resolvedAt).toLocaleString() : "N/A"}
                </div>
              )}

              {selectedItem.status === "PENDING" && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">Resolve This Item</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Attach to Load ID:</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={loadIdInput}
                          onChange={(e) => setLoadIdInput(e.target.value)}
                          placeholder="e.g., 123"
                          className="border rounded px-3 py-2 flex-1"
                        />
                        <button
                          onClick={() => handleResolve("ATTACH_LOAD")}
                          disabled={resolving || !loadIdInput}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Attach Load
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Attach to Carrier ID:</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={carrierIdInput}
                          onChange={(e) => setCarrierIdInput(e.target.value)}
                          placeholder="e.g., 456"
                          className="border rounded px-3 py-2 flex-1"
                        />
                        <button
                          onClick={() => handleResolve("ATTACH_CARRIER")}
                          disabled={resolving || !carrierIdInput}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Attach Carrier
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Notes (optional):</label>
                      <textarea
                        value={notesInput}
                        onChange={(e) => setNotesInput(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve("RESOLVE")}
                        disabled={resolving}
                        className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleResolve("DISCARD")}
                        disabled={resolving}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

QuarantinePage.title = "Webhook Quarantine";
