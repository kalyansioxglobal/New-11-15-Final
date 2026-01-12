import { Skeleton } from '@/components/ui/Skeleton';
import { useState, useEffect } from 'react';
import AddDailyReportModal from './AddDailyReportModal';

interface DailyReport {
    id: number;
    date: string;
    roomSold: number | null;
    totalRoom: number | null;
    cash: number | null;
    credit: number | null;
    online: number | null;
    refund: number | null;
    total: number | null;
    dues: number | null;
    lostDues: number | null;
    occupancy: number | null;
    adr: number | null;
    revpar: number | null;
    highLossFlag: boolean;
}

interface DailyReportsTabProps {
    hotelId: number | string | undefined;
    reportsPage: number;
    onPageChange: (page: number) => void;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
}

const ITEMS_PER_PAGE = 50;

function renderPagination(currentPage: number, total: number, onPageChange: (page: number) => void) {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} results
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default function DailyReportsTab({
    hotelId,
    reportsPage,
    onPageChange,
}: DailyReportsTabProps) {
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [allReports, setAllReports] = useState<DailyReport[]>([]); // All reports from API (last 30-31 days) for summary
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Date filter state - no default, user must select dates to filter table only
    const today = new Date().toISOString().split('T')[0];
    
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const loadReports = async () => {
        if (!hotelId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Always fetch all reports (last 30-31 days) for summary - no date filter
            const limit = 200; // Max limit to get all reports
            const params = new URLSearchParams({ limit: String(limit) });
            const url = `/api/hospitality/hotels/${hotelId}/daily-reports?${params.toString()}`;

            let res: Response;
            try {
                res = await fetch(url);
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                setError('Failed to connect to server. Please check your connection.');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                let errorMessage = `Unable to load daily reports (status: ${res.status})`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (jsonError) {
                    errorMessage = `Server error (status: ${res.status})`;
                }
                setError(errorMessage);
                setLoading(false);
                return;
            }

            let data: any;
            try {
                data = await res.json();
            } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                setError('Invalid response from server. Please try again.');
                setLoading(false);
                return;
            }

            try {
                const reportsFromAPI = Array.isArray(data?.reports) ? data.reports : [];
                
                // Store all reports for summary calculations (always last 30-31 days)
                setAllReports(reportsFromAPI);
                
                // Apply date filter to reports for table display only
                let filteredReports = reportsFromAPI;
                if (fromDate && toDate) {
                    const from = new Date(fromDate);
                    from.setUTCHours(0, 0, 0, 0);
                    const to = new Date(toDate);
                    to.setUTCHours(23, 59, 59, 999);
                    
                    filteredReports = reportsFromAPI.filter((r: DailyReport) => {
                        const reportDate = new Date(r.date);
                        return reportDate >= from && reportDate <= to;
                    });
                }
                
                setTotal(filteredReports.length);

                // Frontend pagination - only for display
                const startIndex = (reportsPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                setReports(filteredReports.slice(startIndex, endIndex));
            } catch (dataError) {
                console.error('Data processing error:', dataError);
                setError('Error processing daily reports data. Please try again.');
            }
        } catch (e: any) {
            console.error('Unexpected error loading daily reports:', e);
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Reset to page 1 when date filters change
    useEffect(() => {
        if (reportsPage !== 1) {
            onPageChange(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate]);

    useEffect(() => {
        loadReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hotelId, reportsPage]);
    
    // When dates change, filter the table display (summary uses allReports)
    useEffect(() => {
        if (allReports.length > 0) {
            let filteredReports = allReports;
            if (fromDate && toDate) {
                const from = new Date(fromDate);
                from.setUTCHours(0, 0, 0, 0);
                const to = new Date(toDate);
                to.setUTCHours(23, 59, 59, 999);
                
                filteredReports = allReports.filter(r => {
                    const reportDate = new Date(r.date);
                    return reportDate >= from && reportDate <= to;
                });
            }
            
            setTotal(filteredReports.length);
            const startIndex = (reportsPage - 1) * ITEMS_PER_PAGE;
            const endIndex = startIndex + ITEMS_PER_PAGE;
            setReports(filteredReports.slice(startIndex, endIndex));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, reportsPage, allReports]);

    // Calculate summary metrics from all reports (last 30-31 days, not filtered)
    const summary = {
        totalRevenue: allReports.reduce((sum, r) => sum + (r.total ?? 0), 0),
        avgOccupancy: (() => {
            const validOccupancy = allReports.filter(r => r.occupancy != null).map(r => r.occupancy!);
            return validOccupancy.length > 0 
                ? validOccupancy.reduce((sum, occ) => sum + occ, 0) / validOccupancy.length 
                : 0;
        })(),
        avgADR: (() => {
            const validADR = allReports.filter(r => r.adr != null).map(r => r.adr!);
            return validADR.length > 0 
                ? validADR.reduce((sum, adr) => sum + adr, 0) / validADR.length 
                : 0;
        })(),
        avgRevPAR: (() => {
            const validRevPAR = allReports.filter(r => r.revpar != null).map(r => r.revpar!);
            return validRevPAR.length > 0 
                ? validRevPAR.reduce((sum, revpar) => sum + revpar, 0) / validRevPAR.length 
                : 0;
        })(),
        lostRevenuePercent: (() => {
            const totalRevenue = allReports.reduce((sum, r) => sum + (r.total ?? 0), 0);
            const totalLostDues = allReports.reduce((sum, r) => sum + (r.lostDues ?? 0), 0);
            return totalRevenue > 0 ? (totalLostDues / totalRevenue) * 100 : 0;
        })(),
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Revenue</div>
                    <div className="font-semibold text-lg text-blue-700 dark:text-blue-400">
                        {loading ? (
                            <Skeleton className="w-full h-5" />
                        ) : error ? (
                            <span className="text-red-500">Error</span>
                        ) : (
                            formatCurrency(summary.totalRevenue)
                        )}
                    </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Occupancy</div>
                    <div className="font-semibold text-lg text-gray-900 dark:text-white">
                        {loading ? (
                            <Skeleton className="w-full h-5" />
                        ) : error ? (
                            <span className="text-red-500">Error</span>
                        ) : (
                            `${summary.avgOccupancy.toFixed(1)}%`
                        )}
                    </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg ADR</div>
                    <div className="font-semibold text-lg text-gray-900 dark:text-white">
                        {loading ? (
                            <Skeleton className="w-full h-5" />
                        ) : error ? (
                            <span className="text-red-500">Error</span>
                        ) : (
                            `$${summary.avgADR.toFixed(2)}`
                        )}
                    </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg RevPAR</div>
                    <div className="font-semibold text-lg text-green-700 dark:text-green-400">
                        {loading ? (
                            <Skeleton className="w-full h-5" />
                        ) : error ? (
                            <span className="text-red-500">Error</span>
                        ) : (
                            `$${summary.avgRevPAR.toFixed(2)}`
                        )}
                    </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lost Revenue %</div>
                    <div className={`font-semibold text-lg ${summary.lostRevenuePercent > 5 ? 'text-red-700 dark:text-red-400' : summary.lostRevenuePercent > 2 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {loading ? (
                            <Skeleton className="w-full h-5" />
                        ) : error ? (
                            <span className="text-red-500">Error</span>
                        ) : (
                            `${summary.lostRevenuePercent.toFixed(1)}%`
                        )}
                    </div>
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Daily Reports</h2>
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Date Filters */}
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    From:
                                </label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                    To:
                                </label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    max={today}
                                    className="px-2 py-1 text-sm bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            {(fromDate || toDate) && (
                                <button
                                    onClick={() => {
                                        setFromDate('');
                                        setToDate('');
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            )}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Daily Report
                            </button>
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="p-6 text-center bg-white dark:bg-slate-800">
                        <div className="text-red-600 dark:text-red-400 mb-2 font-medium">Error loading daily reports</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button
                            onClick={loadReports}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Flag</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rooms</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sold</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cash</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Online</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Refund</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dues</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lost Dues</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lost %</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Occ%</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ADR (Net)</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">RevPAR</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {loading && reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="p-6 text-center text-gray-500 dark:text-gray-400">
                                            <Skeleton className="w-full h-[85vh]" />
                                        </td>
                                    </tr>
                                ) : reports.length > 0 ? (
                                    reports.map(r => (
                                        <tr
                                            key={r.id}
                                            className={`transition-colors duration-150 ${r.highLossFlag
                                                    ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                                                    : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                                                }`}
                                        >
                                            <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">
                                                {r.highLossFlag ? (
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-sm font-bold" title="High Loss Day">
                                                        🚨
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-700">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                {formatDate(r.date)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.totalRoom ?? '—'}</td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{r.roomSold ?? '—'}</td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                {r.cash != null ? formatCurrency(r.cash) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                {r.credit != null ? formatCurrency(r.credit) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                {r.online != null ? formatCurrency(r.online) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-mono text-xs font-medium">
                                                {r.refund != null ? formatCurrency(r.refund) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white font-mono text-xs">
                                                {r.total != null ? formatCurrency(r.total) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-mono text-xs font-medium">
                                                {r.dues != null ? formatCurrency(r.dues) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 font-mono text-xs font-semibold">
                                                {r.lostDues != null ? formatCurrency(r.lostDues) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 font-semibold">
                                                {r.lostDues != null && r.total != null && r.total > 0
                                                    ? `${((r.lostDues / r.total) * 100).toFixed(1)}%`
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                                {r.occupancy != null ? `${r.occupancy.toFixed(1)}%` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 font-mono text-xs">
                                                {r.adr != null ? `$${r.adr.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-mono text-xs font-medium">
                                                {r.revpar != null ? `$${r.revpar.toFixed(2)}` : '—'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={15} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800">
                                            <div className="flex flex-col items-center justify-center">
                                                <svg className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No daily reports found</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Upload data via /api/hotels/upload</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {!error && renderPagination(reportsPage, total, onPageChange)}
            </div>

            {/* Add Daily Report Modal */}
            <AddDailyReportModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                hotelId={hotelId}
                onSuccess={() => {
                    setShowAddModal(false);
                    loadReports();
                }}
            />
        </div>
    );
}
