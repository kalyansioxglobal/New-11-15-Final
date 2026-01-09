import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface Hotel {
  id: number;
  name: string;
}

interface DeleteHotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: Hotel | null;
}

export default function DeleteHotelModal({ isOpen, onClose, hotel }: DeleteHotelModalProps) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!hotel?.id) return;

    if (confirmText !== hotel.name) {
      toast.error('Hotel name does not match. Please type the exact hotel name to confirm deletion.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/hospitality/hotels/${hotel.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete hotel');
      }

      toast.success('Hotel deleted successfully');
      router.push('/hospitality/hotels');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete hotel');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  if (!isOpen || !hotel) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Hotel</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will mark the hotel as CLOSED. The hotel can be restored later by editing its status.
            </p>
          </div>

          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
              To confirm deletion, please type the hotel name:
            </p>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">{hotel.name}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Hotel Name
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400 transition-all"
              placeholder="Type hotel name to confirm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || confirmText !== hotel.name}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Hotel'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
