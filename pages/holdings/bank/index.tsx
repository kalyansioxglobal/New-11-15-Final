import { useState, useEffect, useCallback } from "react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import AddBankAccountModal from "@/components/AddBankAccountModal";
import AddBankSnapshotModal from "@/components/AddBankSnapshotModal";

type BankAccount = {
  id: number;
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  currency: string;
  venture: { id: number; name: string };
  snapshots: Array<{
    id: number;
    balance: number;
    snapshotDate: string;
  }>;
};

type Snapshot = {
  id: number;
  balance: number;
  snapshotDate: string;
  notes: string | null;
  bankAccount: {
    id: number;
    name: string;
    bankName: string | null;
    accountNumber: string | null;
    currency: string;
    venture: { id: number; name: string };
  };
};

type Summary = {
  totalSnapshots: number;
  uniqueAccounts: number;
  totalBalance: number;
  totalsByCurrency?: Record<string, number>;
};

type Venture = { id: number; name: string };

export default function BankSnapshotsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [holdingsVentures, setHoldingsVentures] = useState<Venture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);

  useEffect(() => {
    fetch("/api/ventures?types=HOLDINGS")
      .then((r) => r.json())
      .then((data) => setHoldingsVentures(data || []));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (ventureFilter) params.set("ventureId", ventureFilter);

      const [accountsRes, snapshotsRes] = await Promise.all([
        fetch(`/api/bank-accounts?${params.toString()}`),
        fetch(`/api/bank-snapshots?${params.toString()}`),
      ]);

      if (!accountsRes.ok) throw new Error("Failed to load bank accounts");
      if (!snapshotsRes.ok) throw new Error("Failed to load bank snapshots");

      const accountsData = await accountsRes.json();
      const snapshotsData = await snapshotsRes.json();

      setAccounts(Array.isArray(accountsData) ? accountsData : accountsData?.accounts || []);
      setSnapshots(snapshotsData.snapshots);
      setSummary(snapshotsData.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ventureFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleAccountModalClose(refresh?: boolean) {
    setShowAccountModal(false);
    if (refresh) loadData();
  }

  function handleSnapshotModalClose(refresh?: boolean) {
    setShowSnapshotModal(false);
    if (refresh) loadData();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bank Account Snapshots</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track bank account balances over time
          </p>
        </div>
        {allowCreate && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50"
            >
              + Add Account
            </button>
            <button
              onClick={() => setShowSnapshotModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              + New Snapshot
            </button>
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Unique Accounts</div>
            <div className="text-2xl font-semibold mt-1">
              {summary.uniqueAccounts}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Balance</div>
            {summary.totalsByCurrency &&
            Object.keys(summary.totalsByCurrency).length > 0 ? (
              <div className="mt-1 space-y-1">
                {Object.entries(summary.totalsByCurrency).map(
                  ([currency, amount]) => (
                    <div
                      key={currency}
                      className="text-lg font-semibold text-green-600"
                    >
                      {amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-2xl font-semibold mt-1 text-green-600">
                ${summary.totalBalance.toLocaleString()}
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-500">Total Snapshots</div>
            <div className="text-2xl font-semibold mt-1">
              {summary.totalSnapshots}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">All Ventures</option>
          {holdingsVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-gray-50">
          <div className="text-gray-400 text-3xl mb-3">🏦</div>
          <h3 className="text-gray-700 font-medium mb-1">
            No Bank Snapshots Found
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
            {ventureFilter
              ? "No bank snapshots match your current filter. Try selecting a different venture."
              : accounts.length === 0
                ? "Start by adding a bank account, then record snapshots of the balance."
                : "No balance snapshots recorded yet. Click '+ New Snapshot' to add one."}
          </p>
          {allowCreate && accounts.length === 0 && (
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              + Add First Account
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bank / Account
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Venture
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {snapshots.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(s.snapshotDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {s.bankAccount.bankName || "Unknown Bank"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {s.bankAccount.name}{" "}
                      {s.bankAccount.accountNumber
                        ? `****${s.bankAccount.accountNumber}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.bankAccount.venture?.name || "Global"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {s.bankAccount.currency} ${s.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddBankAccountModal
        open={showAccountModal}
        onClose={handleAccountModalClose}
        ventures={holdingsVentures}
      />

      <AddBankSnapshotModal
        open={showSnapshotModal}
        onClose={handleSnapshotModalClose}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          bankName: a.bankName,
          venture: a.venture,
        }))}
      />
    </div>
  );
}

BankSnapshotsPage.title = "Bank Snapshots";
