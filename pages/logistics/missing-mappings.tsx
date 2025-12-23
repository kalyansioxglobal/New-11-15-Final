import { useEffect, useState } from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type UserWithoutMapping = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
};

type ShipperMissingCode = {
  id: string;
  name: string;
  tmsShipperCode?: string | null;
  internalCode?: string | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
};

type CarrierMissingCode = {
  id: string;
  name: string;
  tmsCarrierCode?: string | null;
  mcNumber?: string | null;
  dotNumber?: string | null;
};

type OrphanLoad = {
  id: string;
  tmsLoadId?: string | null;
  billingDate?: string | null;
  status: string;
  totalRevenue?: string | null;
  totalCost?: string | null;
  marginAmount?: string | null;
  customerId?: string | null;
  shipperId?: string | null;
  carrierId?: string | null;
  customer?: { name: string | null } | null;
  shipper?: { name: string | null } | null;
  carrier?: { name: string | null } | null;
};

type MissingMappingsResponse = {
  usersWithoutMapping: UserWithoutMapping[];
  shippersMissingCodes: ShipperMissingCode[];
  carriersMissingCodes: CarrierMissingCode[];
  orphanLoads: OrphanLoad[];
};

export default function MissingMappingsPage() {
  const [data, setData] = useState<MissingMappingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/logistics/missing-mappings");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <>
      <Head>
        <title>Missing Mappings & Orphan Loads</title>
      </Head>

      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Missing Mappings & Orphan Loads</h1>
          <span className="text-sm text-gray-400">
            Clean your data for P&L + reporting sanity
          </span>
        </div>

        {loading && <div>Loading…</div>}
        {!loading && !data && <div className="text-red-500">Failed to load data.</div>}
        {!loading && data && (
          <div className="space-y-10">
            {/* Users */}
            <section>
              <h2 className="text-xl font-semibold mb-2">Users without TMS / RingCentral Mapping</h2>
              <p className="text-sm text-gray-400 mb-4">
                These users won&apos;t show correctly when you join TMS, RingCentral and Command Center.
              </p>
              {data.usersWithoutMapping.length === 0 ? (
                <div className="text-sm text-emerald-500">All users are mapped.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Phone</th>
                        <th className="px-4 py-2 text-left">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.usersWithoutMapping.map((u) => (
                        <tr key={u.id} className="border-t border-gray-800">
                          <td className="px-4 py-2">{u.name}</td>
                          <td className="px-4 py-2">{u.email}</td>
                          <td className="px-4 py-2">{u.phone || "-"}</td>
                          <td className="px-4 py-2">{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Shippers */}
            <section>
              <h2 className="text-xl font-semibold mb-2">Shippers missing TMS / Internal Codes or Customer</h2>
              <p className="text-sm text-gray-400 mb-4">
                Fix these to anchor loads correctly to your Customer master.
              </p>
              {data.shippersMissingCodes.length === 0 ? (
                <div className="text-sm text-emerald-500">All shippers are mapped.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Shipper</th>
                        <th className="px-4 py-2 text-left">TMS Code</th>
                        <th className="px-4 py-2 text-left">Internal Code</th>
                        <th className="px-4 py-2 text-left">Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shippersMissingCodes.map((s) => (
                        <tr key={s.id} className="border-t border-gray-800">
                          <td className="px-4 py-2">{s.name}</td>
                          <td className="px-4 py-2">{s.tmsShipperCode || <span className="text-red-400">Missing</span>}</td>
                          <td className="px-4 py-2">{s.internalCode || <span className="text-red-400">Missing</span>}</td>
                          <td className="px-4 py-2">
                            {s.customer ? s.customer.name : <span className="text-red-400">Not linked</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Carriers */}
            <section>
              <h2 className="text-xl font-semibold mb-2">Carriers missing TMS Code</h2>
              <p className="text-sm text-gray-400 mb-4">
                You&apos;ll want carrier codes for TMS reconciliations and margin checks.
              </p>
              {data.carriersMissingCodes.length === 0 ? (
                <div className="text-sm text-emerald-500">All carriers are mapped.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Carrier</th>
                        <th className="px-4 py-2 text-left">TMS Code</th>
                        <th className="px-4 py-2 text-left">MC</th>
                        <th className="px-4 py-2 text-left">DOT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.carriersMissingCodes.map((c) => (
                        <tr key={c.id} className="border-t border-gray-800">
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2">{c.tmsCarrierCode || <span className="text-red-400">Missing</span>}</td>
                          <td className="px-4 py-2">{c.mcNumber || "-"}</td>
                          <td className="px-4 py-2">{c.dotNumber || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ORPHAN LOADS PANEL */}
            <section>
              <h2 className="text-xl font-semibold mb-2">Orphan Loads</h2>
              <p className="text-sm text-gray-400 mb-4">
                Loads with missing customer / shipper / carrier / TMS Load ID. These break P&L and reporting.
              </p>
              {data.orphanLoads.length === 0 ? (
                <div className="text-sm text-emerald-500">No orphan loads. Legendary.</div>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Load ID</th>
                        <th className="px-4 py-2 text-left">TMS Load ID</th>
                        <th className="px-4 py-2 text-left">Billing Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Customer</th>
                        <th className="px-4 py-2 text-left">Shipper</th>
                        <th className="px-4 py-2 text-left">Carrier</th>
                        <th className="px-4 py-2 text-right">Revenue</th>
                        <th className="px-4 py-2 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.orphanLoads.map((l) => (
                        <tr key={l.id} className="border-t border-gray-800">
                          <td className="px-4 py-2">{l.id}</td>
                          <td className="px-4 py-2">
                            {l.tmsLoadId || <span className="text-red-400">Missing</span>}
                          </td>
                          <td className="px-4 py-2">
                            {l.billingDate ? new Date(l.billingDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-4 py-2">{l.status}</td>
                          <td className="px-4 py-2">
                            {l.customer ? l.customer.name : <span className="text-red-400">Missing</span>}
                          </td>
                          <td className="px-4 py-2">
                            {l.shipper ? l.shipper.name : <span className="text-red-400">Missing</span>}
                          </td>
                          <td className="px-4 py-2">
                            {l.carrier ? l.carrier.name : <span className="text-red-400">Missing</span>}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {l.totalRevenue ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {l.marginAmount ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
