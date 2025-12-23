// pages/mappings/index.tsx
import React, { useEffect, useState } from "react";

interface UserLite {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
}

interface UserMappingRow {
  id: string;
  rcExtension: string | null;
  rcUserName: string | null;
  rcEmail: string | null;
  tmsEmployeeCode: string | null;
  tmsEmail: string | null;
  notes: string | null;
  user: UserLite;
}

interface ShipperRow {
  id: string;
  name: string;
  tmsShipperCode: string | null;
  internalCode: string | null;
}

interface CustomerRow {
  id: string;
  name: string;
  tmsCustomerCode?: string | null;
  internalCode?: string | null;
}

interface CarrierRow {
  id: string;
  name: string;
  tmsCarrierCode: string | null;
  mcNumber: string | null;
  dotNumber: string | null;
  phone: string | null;
}

interface OrphanLoadRow {
  id: string;
  tmsLoadId: string | null;
  status: string | null;
  billAmount: number | null;
  marginAmount: number | null;
  customerId: string | null;
  carrierId: string | null;
  shipperId: string | null;
  createdById: string | null;
  createdByTmsName: string | null;
}

interface MissingMappingsResponse {
  usersWithoutMapping: UserLite[];
  incompleteUserMappings: UserMappingRow[];
  shippersWithoutInternal: ShipperRow[];
  customersWithoutInternal: CustomerRow[];
  customersNameOnly: CustomerRow[];
  carriersWithoutTmsCode: CarrierRow[];
  orphanLoads: OrphanLoadRow[];
}

const MappingsPage: React.FC = () => {
  const [data, setData] = useState<MissingMappingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mappings/missing");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function updateMapping(payload: any) {
    setSavingId(payload.id);
    setError(null);
    try {
      const res = await fetch("/api/mappings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Unknown error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Missing Mappings</h1>
          <p className="text-sm text-slate-400">
            Fix RingCentral ⇄ TMS ⇄ Command Center identity links and data gaps.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Users without mapping */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Users without any mapping</h2>
            <span className="text-xs text-slate-400">
              {data?.usersWithoutMapping.length ?? 0} users
            </span>
          </div>
          {data?.usersWithoutMapping.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">Email</th>
                    <th className="text-left px-2 py-1">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usersWithoutMapping.map((u) => (
                    <tr key={u.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">{u.name || "—"}</td>
                      <td className="px-2 py-1">{u.email}</td>
                      <td className="px-2 py-1 text-slate-400">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No unmapped users. Good.</p>
          )}
        </section>

        {/* UserMapping editor */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Incomplete user mappings</h2>
            <span className="text-xs text-slate-400">
              {data?.incompleteUserMappings.length ?? 0} rows
            </span>
          </div>
          {data?.incompleteUserMappings.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">User</th>
                    <th className="text-left px-2 py-1">RC Ext</th>
                    <th className="text-left px-2 py-1">RC Email</th>
                    <th className="text-left px-2 py-1">TMS User ID</th>
                    <th className="text-left px-2 py-1">Save</th>
                  </tr>
                </thead>
                <tbody>
                  {data.incompleteUserMappings.map((m) => (
                    <tr key={m.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">
                        <div className="font-medium">{m.user.name || "—"}</div>
                        <div className="text-[10px] text-slate-400">
                          {m.user.email}
                        </div>
                        {m.rcUserName && (
                          <div className="text-[10px] text-amber-300">
                            RC Name: {m.rcUserName}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={m.rcExtension ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "userMapping",
                              id: m.id,
                              rcExtension: e.target.value || null,
                            })
                          }
                          className="w-20 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="ext"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={m.rcEmail ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "userMapping",
                              id: m.id,
                              rcEmail: e.target.value || null,
                            })
                          }
                          className="w-36 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="rc email"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={m.tmsEmployeeCode ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "userMapping",
                              id: m.id,
                              tmsEmployeeCode: e.target.value || null,
                            })
                          }
                          className="w-24 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="tms id"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() =>
                            updateMapping({
                              type: "userMapping",
                              id: m.id,
                              rcExtension: m.rcExtension,
                              rcEmail: m.rcEmail,
                              tmsEmployeeCode: m.tmsEmployeeCode,
                              rcUserName: m.rcUserName,
                            })
                          }
                          disabled={savingId === m.id}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-medium disabled:opacity-50"
                        >
                          {savingId === m.id ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No incomplete mappings.</p>
          )}
        </section>

        {/* Shippers internal codes */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Shippers missing internal code</h2>
            <span className="text-xs text-slate-400">
              {data?.shippersWithoutInternal.length ?? 0} shippers
            </span>
          </div>
          {data?.shippersWithoutInternal.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">TMS Code</th>
                    <th className="text-left px-2 py-1">Internal Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shippersWithoutInternal.map((s) => (
                    <tr key={s.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">{s.name}</td>
                      <td className="px-2 py-1 text-slate-400">
                        {s.tmsShipperCode || "—"}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={s.internalCode ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "shipperInternal",
                              id: s.id,
                              internalCode: e.target.value || null,
                            })
                          }
                          className="w-28 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="internal code"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">All shippers have internal codes.</p>
          )}
        </section>

        {/* Customers missing internal codes (with TMS code) */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              Customers with TMS code missing internal code
            </h2>
            <span className="text-xs text-slate-400">
              {data?.customersWithoutInternal.length ?? 0} customers
            </span>
          </div>
          {data?.customersWithoutInternal.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">TMS Code</th>
                    <th className="text-left px-2 py-1">Internal Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customersWithoutInternal.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">{c.name}</td>
                      <td className="px-2 py-1 text-slate-400">
                        {c.tmsCustomerCode || "—"}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={c.internalCode ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "customerInternal",
                              id: c.id,
                              internalCode: e.target.value || null,
                            })
                          }
                          className="w-28 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="internal code"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              All code-based customers have internal codes.
            </p>
          )}
        </section>

        {/* Customers created by name only */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              Customers created from 3PL by name only
            </h2>
            <span className="text-xs text-slate-400">
              {data?.customersNameOnly.length ?? 0} customers
            </span>
          </div>
          {data?.customersNameOnly.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customersNameOnly.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">{c.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No name-only customers without codes.
            </p>
          )}
        </section>

        {/* Carriers missing TMS codes */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              Carriers missing TMS Carrier Code
            </h2>
            <span className="text-xs text-slate-400">
              {data?.carriersWithoutTmsCode.length ?? 0} carriers
            </span>
          </div>
          {data?.carriersWithoutTmsCode.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Name</th>
                    <th className="text-left px-2 py-1">MC / DOT</th>
                    <th className="text-left px-2 py-1">TMS Code</th>
                  </tr>
                </thead>
                <tbody>
                  {data.carriersWithoutTmsCode.map((c) => (
                    <tr key={c.id} className="border-t border-slate-800/60">
                      <td className="px-2 py-1">{c.name}</td>
                      <td className="px-2 py-1 text-slate-400">
                        {c.mcNumber || "—"} / {c.dotNumber || "—"}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          defaultValue={c.tmsCarrierCode ?? ""}
                          onBlur={(e) =>
                            updateMapping({
                              type: "carrierTmsCode",
                              id: c.id,
                              tmsCarrierCode: e.target.value || null,
                            })
                          }
                          className="w-28 rounded bg-slate-800 border border-slate-700 px-1 py-0.5 text-xs"
                          placeholder="tms code"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">All carriers have TMS codes.</p>
          )}
        </section>

        {/* Orphan loads */}
        <section className="border border-slate-800 rounded-2xl bg-slate-900/70 p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Orphan Loads (missing links)</h2>
            <span className="text-xs text-slate-400">
              {data?.orphanLoads.length ?? 0} loads
            </span>
          </div>
          {data?.orphanLoads.length ? (
            <div className="max-h-80 overflow-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="text-slate-400">
                    <th className="text-left px-2 py-1">Load</th>
                    <th className="text-left px-2 py-1">Status</th>
                    <th className="text-left px-2 py-1">Bill / Margin</th>
                    <th className="text-left px-2 py-1">Dispatcher</th>
                    <th className="text-left px-2 py-1">Missing</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orphanLoads.map((l) => {
                    const missing: string[] = [];
                    if (!l.customerId) missing.push("Customer");
                    if (!l.carrierId) missing.push("Carrier");
                    if (!l.shipperId) missing.push("Shipper");
                    if (!l.createdById) missing.push("User");
                    return (
                      <tr key={l.id} className="border-t border-slate-800/60">
                        <td className="px-2 py-1">{l.tmsLoadId || l.id}</td>
                        <td className="px-2 py-1 text-slate-400">
                          {l.status || "—"}
                        </td>
                        <td className="px-2 py-1">
                          {l.billAmount != null ? `$${l.billAmount.toFixed(2)}` : "—"}
                          {l.marginAmount != null && (
                            <span className="text-[10px] text-emerald-300 ml-1">
                              (M: ${l.marginAmount.toFixed(2)})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {l.createdByTmsName ? (
                            <span>{l.createdByTmsName}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1">
                          {missing.length ? (
                            <span className="text-[10px] text-amber-300">
                              {missing.join(", ")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No orphan loads. All loads are fully linked.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};

export default MappingsPage;
