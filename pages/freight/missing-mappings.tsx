import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Skeleton } from "@/components/ui/Skeleton";

type OrphanLoad = {
  id: number;
  tmsLoadId: string | null;
  reference: string | null;
  status: string;
  billAmount: number | null;
  costAmount: number | null;
  marginAmount: number | null;
  marginPercentage: number | null;
  pickupDate: string | null;
  pickupCity: string | null;
  pickupState: string | null;
  dropCity: string | null;
  dropState: string | null;
  customerId: number | null;
  shipperId: number | null;
  carrierId: number | null;
  ventureId: number | null;
  customer: { id: number; name: string } | null;
  shipper: { id: number; name: string } | null;
  carrier: { id: number; name: string; mcNumber: string | null } | null;
  venture: { id: number; name: string } | null;
  missingMappings: {
    customer: boolean;
    shipper: boolean;
    carrier: boolean;
    tmsLoadId: boolean;
  };
};

type MissingMappingsResponse = {
  loads: OrphanLoad[];
  total: number;
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  WORKING: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  COVERED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  LOST: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  DORMANT: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  MAYBE: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
};

export default function FreightMissingMappingsPage() {
  const { loading: roleLoading, authorized } = useRoleGuard();
  const [data, setData] = useState<MissingMappingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/freight/missing-mappings");
        if (!res.ok) {
          throw new Error("Failed to load missing mappings");
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (roleLoading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }
  if (!authorized) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Missing Mappings - Loads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Loads with missing customer, shipper, carrier, or TMS Load ID mappings
          </p>
        </div>
      </div>

      {loading && <Skeleton className="w-full h-[85vh]" />}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Unmapped Loads
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {data.total} load{data.total !== 1 ? "s" : ""} found
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              These loads are missing critical mappings that may affect P&L reporting and data integrity.
            </p>
          </div>

          {data.loads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">✅</div>
              <h3 className="text-gray-700 dark:text-gray-200 font-medium mb-1">No Unmapped Loads</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All loads have proper mappings. Great job!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Load ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Reference</th>
                    <th className="px-4 py-3 text-left font-semibold">Lane</th>
                    <th className="px-4 py-3 text-left font-semibold">Pickup Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Venture</th>
                    <th className="px-4 py-3 text-left font-semibold">Missing Mappings</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Shipper</th>
                    <th className="px-4 py-3 text-left font-semibold">Carrier</th>
                    <th className="px-4 py-3 text-right font-semibold">Bill</th>
                    <th className="px-4 py-3 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.loads.map((load) => (
                    <tr key={load.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <Link
                          href={`/freight/loads/${load.id}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          #{load.id}
                        </Link>
                        {load.tmsLoadId && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            TMS: {load.tmsLoadId}
                          </div>
                        )}
                        {load.missingMappings.tmsLoadId && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                            Missing TMS Load ID
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {load.reference || <span className="text-gray-400 dark:text-gray-500">-</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <div className="font-medium">
                          {load.pickupCity && load.pickupState
                            ? `${load.pickupCity}, ${load.pickupState}`
                            : "-"}
                        </div>
                        {load.dropCity && load.dropState && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            to {load.dropCity}, {load.dropState}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.pickupDate ? new Date(load.pickupDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[load.status] || "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {load.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.venture?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {load.missingMappings.customer && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                              Customer
                            </span>
                          )}
                          {load.missingMappings.shipper && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                              Shipper
                            </span>
                          )}
                          {load.missingMappings.carrier && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                              Carrier
                            </span>
                          )}
                          {load.missingMappings.tmsLoadId && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                              TMS ID
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.customer ? (
                          load.customer.name
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.shipper ? (
                          load.shipper.name
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {load.carrier ? (
                          <Link
                            href={`/freight/carriers/${load.carrier.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {load.carrier.name}
                          </Link>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {load.billAmount != null ? `$${load.billAmount.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {load.marginAmount != null ? `$${load.marginAmount.toFixed(2)}` : "—"}
                        {load.marginPercentage != null && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({load.marginPercentage.toFixed(1)}%)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

FreightMissingMappingsPage.title = "Missing Mappings";

