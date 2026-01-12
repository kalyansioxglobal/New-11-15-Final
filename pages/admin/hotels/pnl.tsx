import { GetServerSideProps } from 'next';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { getServerSidePropsForPnlPage } from '@/lib/hotels/pnlPageServer';
import { Skeleton } from '@/components/ui/Skeleton';

interface PnlMonth {
  month: number;
  baseRevenue: number | null;
  payroll: number;
  utilities: number;
  repairsMaintenance: number;
  marketing: number;
  otaCommissions: number;
  insurance: number;
  propertyTax: number;
  adminGeneral: number;
  cashExpenses: number;
  bankExpenses: number;
  other1Label: string | null;
  other1Amount: number;
  other2Label: string | null;
  other2Amount: number;
  other3Label: string | null;
  other3Amount: number;
  other4Label: string | null;
  other4Amount: number;
  other5Label: string | null;
  other5Amount: number;
  other6Label: string | null;
  other6Amount: number;
  other7Label: string | null;
  other7Amount: number;
  other8Label: string | null;
  other8Amount: number;
  notes: string | null;
  totalExpenses: number;
  net: number;
}

interface AdminPnlPageProps {
  hotels: Array<{ id: number; name: string; code?: string }>;
  initialHotelId: number | null;
  initialYear: number;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const EXPENSE_FIELDS = [
  { key: 'payroll', label: 'Payroll' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'repairsMaintenance', label: 'Repairs & Maintenance' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'otaCommissions', label: 'OTA Commissions' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'propertyTax', label: 'Property Tax' },
  { key: 'adminGeneral', label: 'Admin & General' },
];

export default function AdminPnlPage({ hotels, initialHotelId, initialYear }: AdminPnlPageProps) {
  const router = useRouter();
  const [hotelId, setHotelId] = useState<number | null>(initialHotelId);
  const [year, setYear] = useState(initialYear);
  const [months, setMonths] = useState<PnlMonth[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  // Check if a month/year is in the future
  const isFutureMonth = (monthYear: number, monthNum: number): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    return monthYear > currentYear || (monthYear === currentYear && monthNum > currentMonth);
  };

  // Fetch P&L data when hotel or year changes
  const fetchPnl = useCallback(async () => {
    if (!hotelId) {
      toast.error('Please select a hotel');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/hotels/pnl/monthly?hotelId=${hotelId}&year=${year}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }
      const data = await res.json();
      setMonths(data.months);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch P&L data');
    } finally {
      setLoading(false);
    }
  }, [hotelId, year]);

  // Load initial data on mount
  const handleLoadData = () => {
    fetchPnl();
  };

  // Update a field in a month
  const updateField = (monthIndex: number, field: string, value: any) => {
    const updated = [...months];
    (updated[monthIndex] as any)[field] = value;

    // Recompute metrics if it's an expense field or revenue
    if (field === 'baseRevenue' || field === 'cashExpenses' || field === 'bankExpenses' || EXPENSE_FIELDS.some((f) => f.key === field) || field.startsWith('other')) {
      const month = updated[monthIndex];
      const revenue = month.baseRevenue ?? 0;
      const operatingExpenses =
        month.payroll +
        month.utilities +
        month.repairsMaintenance +
        month.marketing +
        month.otaCommissions +
        month.insurance +
        month.propertyTax +
        month.adminGeneral +
        month.other1Amount +
        month.other2Amount +
        month.other3Amount +
        month.other4Amount +
        month.other5Amount +
        month.other6Amount +
        month.other7Amount +
        month.other8Amount;
      const totalExpenses = operatingExpenses + month.cashExpenses + month.bankExpenses;
      month.totalExpenses = totalExpenses;
      month.net = revenue - totalExpenses;
    }

    setMonths(updated);
  };

  // Save a month's data
  const saveMonth = async (monthIndex: number) => {
    if (!hotelId) return;
    const month = months[monthIndex];

    setSaving(monthIndex);
    try {
      const res = await fetch('/api/hotels/pnl/monthly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId,
          year,
          month: month.month,
          baseRevenue: month.baseRevenue,
          payroll: month.payroll,
          utilities: month.utilities,
          repairsMaintenance: month.repairsMaintenance,
          marketing: month.marketing,
          otaCommissions: month.otaCommissions,
          insurance: month.insurance,
          propertyTax: month.propertyTax,
          adminGeneral: month.adminGeneral,
          cashExpenses: month.cashExpenses,
          bankExpenses: month.bankExpenses,
          other1Label: month.other1Label,
          other1Amount: month.other1Amount,
          other2Label: month.other2Label,
          other2Amount: month.other2Amount,
          other3Label: month.other3Label,
          other3Amount: month.other3Amount,
          other4Label: month.other4Label,
          other4Amount: month.other4Amount,
          other5Label: month.other5Label,
          other5Amount: month.other5Amount,
          other6Label: month.other6Label,
          other6Amount: month.other6Amount,
          other7Label: month.other7Label,
          other7Amount: month.other7Amount,
          other8Label: month.other8Label,
          other8Amount: month.other8Amount,
          notes: month.notes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `Failed to save: ${res.statusText}`);
      }

      toast.success(`${MONTHS[month.month - 1].label} saved`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <Head>
        <title>Hotel P&L Manager</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Hotel P&L Manager</h1>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hotel</label>
                <select
                  value={hotelId ?? ''}
                  onChange={(e) => setHotelId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white"
                >
                  <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">-- Select Hotel --</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {h.name} {h.code ? `(${h.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
            <button
              onClick={handleLoadData}
              disabled={!hotelId || loading}
              className="btn"
            >
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>

          {/* P&L Table */}
          {months.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Month</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Revenue</th>
                    {EXPENSE_FIELDS.map((field) => (
                      <th key={field.key} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 1</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 2</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 3</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 4</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 5</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 6</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 7</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Other 8</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30">Cash Exp</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30">Bank Exp</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Total Expenses</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Net P&L</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, idx) => {
                    const isFuture = isFutureMonth(year, month.month);
                    return (
                    <tr key={month.month} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${isFuture ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {MONTHS[month.month - 1].label}
                          {isFuture && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800" title="Future month - cannot edit">
                              Future
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          step="0.01"
                          value={month.baseRevenue ?? ''}
                          onChange={(e) =>
                            updateField(idx, 'baseRevenue', e.target.value ? parseFloat(e.target.value) : null)
                          }
                          disabled={isFuture}
                          className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                        />
                      </td>
                      {EXPENSE_FIELDS.map((field) => (
                        <td key={field.key} className="px-6 py-4">
                          <input
                            type="number"
                            step="0.01"
                            value={(month as any)[field.key] ?? 0}
                            onChange={(e) => updateField(idx, field.key, parseFloat(e.target.value))}
                            disabled={isFuture}
                            className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                        </td>
                      ))}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Label"
                            value={month.other1Label ?? ''}
                            onChange={(e) => updateField(idx, 'other1Label', e.target.value)}
                            disabled={isFuture}
                            className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={month.other1Amount ?? 0}
                            onChange={(e) => updateField(idx, 'other1Amount', parseFloat(e.target.value))}
                            disabled={isFuture}
                            className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Label"
                            value={month.other2Label ?? ''}
                            onChange={(e) => updateField(idx, 'other2Label', e.target.value)}
                            disabled={isFuture}
                            className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={month.other2Amount ?? 0}
                            onChange={(e) => updateField(idx, 'other2Amount', parseFloat(e.target.value))}
                            disabled={isFuture}
                            className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                          />
                        </div>
                      </td>
                      {[3, 4, 5, 6, 7, 8].map((n) => (
                        <td key={`other${n}`} className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              placeholder="Label"
                              value={(month as any)[`other${n}Label`] ?? ''}
                              onChange={(e) => updateField(idx, `other${n}Label`, e.target.value)}
                              disabled={isFuture}
                              className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={(month as any)[`other${n}Amount`] ?? 0}
                              onChange={(e) => updateField(idx, `other${n}Amount`, parseFloat(e.target.value))}
                              disabled={isFuture}
                              className={`w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-4 bg-green-50 dark:bg-green-900/30">
                        <input
                          type="number"
                          step="0.01"
                          value={month.cashExpenses ?? 0}
                          onChange={(e) => updateField(idx, 'cashExpenses', parseFloat(e.target.value) || 0)}
                          disabled={isFuture}
                          className={`w-20 px-2 py-1 border border-green-300 dark:border-green-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-green-500 dark:focus:border-green-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 bg-blue-50 dark:bg-blue-900/30">
                        <input
                          type="number"
                          step="0.01"
                          value={month.bankExpenses ?? 0}
                          onChange={(e) => updateField(idx, 'bankExpenses', parseFloat(e.target.value) || 0)}
                          disabled={isFuture}
                          className={`w-20 px-2 py-1 border border-blue-300 dark:border-blue-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 ${isFuture ? 'cursor-not-allowed opacity-60' : ''}`}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        ${month.totalExpenses.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${month.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${month.net.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => saveMonth(idx)}
                          disabled={saving === idx || isFuture}
                          className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:text-gray-300 dark:disabled:text-gray-500 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                          title={isFuture ? 'Cannot save P&L data for future months' : ''}
                        >
                          {saving === idx ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && months.length === 0 && hotelId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-300">
              Load hotel P&L data to edit
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<AdminPnlPageProps> = (context) => {
  return getServerSidePropsForPnlPage(context);
};
