import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface AddDailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: number | string | undefined;
  onSuccess: () => void;
}

export default function AddDailyReportModal({
  isOpen,
  onClose,
  hotelId,
  onSuccess,
}: AddDailyReportModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    date: today,
    roomsSold: '',
    roomsAvailable: '',
    roomRevenue: '',
    cash: '',
    credit: '',
    online: '',
    refund: '',
    dues: '',
    lostDues: '',
    otherRevenue: '',
  });
  const [saving, setSaving] = useState(false);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  // Check if report exists when date changes or modal opens
  useEffect(() => {
    if (isOpen && hotelId && formData.date) {
      checkExistingReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hotelId, formData.date]);

  // Hide scrollbar when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const checkExistingReport = async () => {
    if (!hotelId || !formData.date) return;
    
    setChecking(true);
    try {
      const res = await fetch(`/api/hospitality/hotels/${hotelId}/daily-reports?limit=200`);
      if (res.ok) {
        const data = await res.json();
        const reports = data.reports || [];
        const parsedDate = new Date(formData.date);
        parsedDate.setUTCHours(0, 0, 0, 0);
        
        const existing = reports.find((r: any) => {
          const reportDate = new Date(r.date);
          reportDate.setUTCHours(0, 0, 0, 0);
          return reportDate.getTime() === parsedDate.getTime();
        });

        if (existing) {
          setExistingReport(existing);
          // Pre-fill form with existing data
          setFormData({
            date: formData.date,
            roomsSold: existing.roomSold?.toString() || '',
            roomsAvailable: existing.totalRoom?.toString() || '',
            roomRevenue: existing.total?.toString() || '',
            cash: existing.cash?.toString() || '',
            credit: existing.credit?.toString() || '',
            online: existing.online?.toString() || '',
            refund: existing.refund?.toString() || '',
            dues: existing.dues?.toString() || '',
            lostDues: existing.lostDues?.toString() || '',
            otherRevenue: '',
          });
        } else {
          setExistingReport(null);
          // Reset form if no existing report
          setFormData(prev => ({
            date: prev.date,
            roomsSold: '',
            roomsAvailable: '',
            roomRevenue: '',
            cash: '',
            credit: '',
            online: '',
            refund: '',
            dues: '',
            lostDues: '',
            otherRevenue: '',
          }));
        }
      }
    } catch (err) {
      console.error('Error checking existing report:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hotelId) {
      toast.error('Hotel ID is required');
      return;
    }

    const sold = Number(formData.roomsSold) || 0;
    const available = Number(formData.roomsAvailable) || 0;

    if (sold <= 0 && Number(formData.roomRevenue) <= 0) {
      toast.error('Please enter rooms sold or room revenue');
      return;
    }

    if (available > 0 && sold > available) {
      toast.error('Rooms sold cannot exceed rooms available');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/hotels/${hotelId}/daily-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Daily report saved successfully!');
        // Reset form
        setFormData({
          date: today,
          roomsSold: '',
          roomsAvailable: '',
          roomRevenue: '',
          cash: '',
          credit: '',
          online: '',
          refund: '',
          dues: '',
          lostDues: '',
          otherRevenue: '',
        });
        onClose();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to save daily report');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm dark:bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {existingReport ? 'Update Daily Report' : 'Add Daily Report'}
            </h2>
            {existingReport && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                A report already exists for this date. Updating will replace existing data.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={checking}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {checking && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Checking for existing report...</p>
                )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rooms Sold
              </label>
              <input
                type="number"
                min="0"
                value={formData.roomsSold}
                onChange={(e) => handleInputChange('roomsSold', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rooms Available
              </label>
              <input
                type="number"
                min="0"
                value={formData.roomsAvailable}
                onChange={(e) => handleInputChange('roomsAvailable', e.target.value)}
                placeholder="Uses hotel default if empty"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>

          {/* Revenue Section */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Revenue
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Room Revenue ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.roomRevenue}
                  onChange={(e) => handleInputChange('roomRevenue', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Other Revenue ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.otherRevenue}
                  onChange={(e) => handleInputChange('otherRevenue', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>
          </div>

          {/* Payment Breakdown Section */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Payment Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cash ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cash}
                  onChange={(e) => handleInputChange('cash', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Credit ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.credit}
                  onChange={(e) => handleInputChange('credit', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Online ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.online}
                  onChange={(e) => handleInputChange('online', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Refund ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.refund}
                  onChange={(e) => handleInputChange('refund', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>
          </div>

          {/* Dues Section */}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Dues & Losses
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dues ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.dues}
                  onChange={(e) => handleInputChange('dues', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lost Dues ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.lostDues}
                  onChange={(e) => handleInputChange('lostDues', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                existingReport ? 'Update Daily Report' : 'Save Daily Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

