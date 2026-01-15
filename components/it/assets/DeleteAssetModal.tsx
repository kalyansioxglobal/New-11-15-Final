import { useState } from 'react';
import toast from 'react-hot-toast';

interface Asset {
  id: number;
  tag: string;
  status: string;
}

interface DeleteAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSuccess: () => void;
}

export default function DeleteAssetModal({ isOpen, onClose, asset, onSuccess }: DeleteAssetModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!asset?.id) return;

    // Double-check status on client side
    if (asset.status !== 'AVAILABLE') {
      toast.error('Only assets with status AVAILABLE can be deleted.');
      onClose();
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/it-assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.detail || 'Failed to delete asset');
      }

      toast.success(`Asset "${asset.tag}" deleted successfully`);
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      onClose();
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) {
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Asset</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete asset <span className="font-semibold text-gray-900 dark:text-white">"{asset.tag}"</span>? This action cannot be undone.
            </p>
          </div>

          {asset.status !== 'AVAILABLE' && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                ⚠️ Only assets with status <span className="font-semibold">AVAILABLE</span> can be deleted.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Current status: <span className="font-semibold">{asset.status}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={deleting}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || asset.status !== 'AVAILABLE'}
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
                'Delete Asset'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

