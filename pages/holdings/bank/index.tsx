import { useState, useEffect, useCallback } from "react";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import AddBankAccountModal from "@/components/AddBankAccountModal";
import AddBankSnapshotModal from "@/components/AddBankSnapshotModal";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

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

type Venture = { id: number; name: string };

type TabType = "accounts" | "snapshots";

export default function BankSnapshotsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("accounts");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [allAccountsForModal, setAllAccountsForModal] = useState<BankAccount[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [holdingsVentures, setHoldingsVentures] = useState<Venture[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [ventureFilter, setVentureFilter] = useState<string>("");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  
  // Pagination state for accounts
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsPageSize] = useState(30);
  const [accountsTotalPages, setAccountsTotalPages] = useState(1);
  const [accountsTotalCount, setAccountsTotalCount] = useState(0);

  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || "EMPLOYEE") as UserRole;
  const allowCreate = isSuperAdmin(role);
  const ALLOWED_ROLES = ["CEO", "ADMIN", "COO", "FINANCE"];
  const canView = ALLOWED_ROLES.includes(role);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/ventures");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setHoldingsVentures(data || []);
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load all accounts (for modal dropdown) - always load
  const loadAllAccounts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (ventureFilter) params.set("ventureId", ventureFilter);
      params.set("pageSize", "200"); // Get enough for dropdown

      const res = await fetch(`/api/bank-accounts?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load bank accounts");
      }

      const data = await res.json();
      setAllAccountsForModal(data.items || []);
    } catch (e: any) {
      console.error("Failed to load accounts for modal:", e);
      setAllAccountsForModal([]);
    }
  }, [ventureFilter]);

  // Load accounts with pagination (for accounts tab)
  const loadAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);

      const params = new URLSearchParams();
      if (ventureFilter) params.set("ventureId", ventureFilter);
      params.set("page", String(accountsPage));
      params.set("pageSize", String(accountsPageSize));

      const res = await fetch(`/api/bank-accounts?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load bank accounts");
      }

      const data = await res.json();
      setAccounts(data.items || []);
      setAccountsTotalPages(data.totalPages || 1);
      setAccountsTotalCount(data.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load bank accounts");
    } finally {
      setLoadingAccounts(false);
    }
  }, [ventureFilter, accountsPage, accountsPageSize]);

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    try {
      setLoadingSnapshots(true);

      const params = new URLSearchParams();
      if (ventureFilter) params.set("ventureId", ventureFilter);

      const res = await fetch(`/api/bank-snapshots?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to load bank snapshots");
      }

      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load bank snapshots");
    } finally {
      setLoadingSnapshots(false);
    }
  }, [ventureFilter]);

  // Always load all accounts for modal
  useEffect(() => {
    loadAllAccounts();
  }, [loadAllAccounts]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "accounts") {
      loadAccounts();
    } else {
      loadSnapshots();
    }
  }, [activeTab, loadAccounts, loadSnapshots]);

  // Reset accounts page when filter changes
  useEffect(() => {
    if (activeTab === "accounts") {
      setAccountsPage(1);
    }
  }, [ventureFilter, activeTab]);

  function handleAccountModalClose(refresh?: boolean) {
    setShowAccountModal(false);
    if (refresh) {
      loadAllAccounts(); // Always refresh all accounts for modal
      if (activeTab === "accounts") {
        loadAccounts(); // Refresh paginated accounts if on accounts tab
      }
      toast.success("Bank account created successfully");
    }
  }

  function handleSnapshotModalClose(refresh?: boolean) {
    setShowSnapshotModal(false);
    if (refresh) {
      if (activeTab === "snapshots") {
        loadSnapshots();
      }
      // Also refresh accounts to update snapshot counts
      if (activeTab === "accounts") {
        loadAccounts();
      }
      // Refresh all accounts to update snapshot counts in modal
      loadAllAccounts();
      toast.success("Bank snapshot created successfully");
    }
  }

  if (!canView) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-5xl mb-3">🔒</div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            You don't have permission to view bank snapshots. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Accounts & Snapshots</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage bank accounts and track balances over time
          </p>
        </div>
        {allowCreate && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              + Add Account
            </button>
            {activeTab === "snapshots" && (
              <button
                onClick={() => setShowSnapshotModal(true)}
                className="btn"
              >
                + New Snapshot
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "accounts"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            View Accounts
          </button>
          <button
            onClick={() => setActiveTab("snapshots")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "snapshots"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Snapshots
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
        >
          <option value="">All Ventures</option>
          {holdingsVentures.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Accounts Tab Content */}
      {activeTab === "accounts" && (
        <>
          {loadingAccounts ? (
            <Skeleton className="w-full h-[85vh]" />
          ) : accounts.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-5xl mb-3">🏦</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Bank Accounts Found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                {ventureFilter
                  ? "No bank accounts match your current filter. Try selecting a different venture."
                  : "Start by adding a bank account to track balances."}
              </p>
              {allowCreate && (
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="btn"
                >
                  + Add First Account
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Account Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Bank Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Account Number</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Venture</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Currency</th>
                        <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Latest Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {accounts.map((account) => (
                        <tr key={account.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {account.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.bankName || "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.accountNumber ? `****${account.accountNumber}` : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.venture?.name || "Global"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {account.currency}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {account.snapshots && account.snapshots.length > 0 ? (
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                {account.snapshots[0].balance.toLocaleString(undefined, {
                                  style: "currency",
                                  currency: account.currency || "USD",
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">No snapshot</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination for Accounts */}
              {!loadingAccounts && accounts.length > 0 && accountsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {((accountsPage - 1) * accountsPageSize) + 1} to {Math.min(accountsPage * accountsPageSize, accountsTotalCount)} of {accountsTotalCount} accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAccountsPage((p) => Math.max(1, p - 1))}
                      disabled={accountsPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Page {accountsPage} of {accountsTotalPages}
                    </div>
                    <button
                      onClick={() => setAccountsPage((p) => Math.min(accountsTotalPages, p + 1))}
                      disabled={accountsPage >= accountsTotalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Snapshots Tab Content */}
      {activeTab === "snapshots" && (
        <>
          {loadingSnapshots ? (
            <Skeleton className="w-full h-[85vh]" />
          ) : snapshots.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-5xl mb-3">🏦</div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Bank Snapshots Found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                {ventureFilter
                  ? "No bank snapshots match your current filter. Try selecting a different venture."
                  : allAccountsForModal.length === 0
                    ? "Start by adding a bank account, then record snapshots of the balance."
                    : "No balance snapshots recorded yet. Click '+ New Snapshot' to add one."}
              </p>
              {allowCreate && allAccountsForModal.length === 0 && (
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="btn"
                >
                  + Add First Account
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Date</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Bank / Account</th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-700 dark:text-gray-300">Venture</th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {snapshots.map((s) => (
                      <tr key={s.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(s.snapshotDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {s.bankAccount.bankName || "Unknown Bank"}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {s.bankAccount.name}{" "}
                            {s.bankAccount.accountNumber
                              ? `****${s.bankAccount.accountNumber}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {s.bankAccount.venture?.name || "Global"}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600 dark:text-green-400">
                          {s.balance.toLocaleString(undefined, {
                            style: "currency",
                            currency: s.bankAccount.currency || "USD",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <AddBankAccountModal
        open={showAccountModal}
        onClose={handleAccountModalClose}
        ventures={holdingsVentures}
      />

      <AddBankSnapshotModal
        open={showSnapshotModal}
        onClose={handleSnapshotModalClose}
        accounts={allAccountsForModal.map((a) => ({
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
