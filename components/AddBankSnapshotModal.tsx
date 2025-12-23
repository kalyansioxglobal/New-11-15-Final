import React, { useState } from "react";

type BankAccount = {
  id: number;
  name: string;
  bankName: string | null;
  venture: { id: number; name: string } | null;
};

type AddBankSnapshotModalProps = {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  accounts: BankAccount[];
};

export default function AddBankSnapshotModal({
  open,
  onClose,
  accounts,
}: AddBankSnapshotModalProps) {
  const [form, setForm] = useState({
    bankAccountId: "",
    balance: "",
    snapshotDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bankAccountId || form.balance === "") {
      setError("Account and Balance are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bank-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: Number(form.bankAccountId),
          balance: Number(form.balance),
          snapshotDate: form.snapshotDate
            ? new Date(form.snapshotDate).toISOString()
            : new Date().toISOString(),
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create snapshot");
      }

      setForm({
        bankAccountId: "",
        balance: "",
        snapshotDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      onClose(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 rounded-xl bg-white shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            New Bank Snapshot
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {accounts.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm">
              No bank accounts found. Please create a bank account first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.bankAccountId}
                  onChange={(e) =>
                    setForm({ ...form, bankAccountId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.bankName ? ` (${a.bankName})` : ""}
                      {a.venture ? ` - ${a.venture.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.balance}
                    onChange={(e) =>
                      setForm({ ...form, balance: e.target.value })
                    }
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Snapshot Date
                </label>
                <input
                  type="date"
                  value={form.snapshotDate}
                  onChange={(e) =>
                    setForm({ ...form, snapshotDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes about this snapshot"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || accounts.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Snapshot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
