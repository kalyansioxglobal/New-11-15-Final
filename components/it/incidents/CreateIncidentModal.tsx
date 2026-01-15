import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import toast from 'react-hot-toast';

const INCIDENT_CATEGORIES = ["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS", "OTHER"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const INITIAL_FORM_DATA = {
  assetId: "",
  title: "",
  description: "",
  category: "OTHER",
  severity: "LOW",
  assignedToUserId: "",
};

type Asset = {
  id: number;
  tag: string;
  type?: string;
  category?: string;
};

type User = {
  id: number;
  name?: string;
  fullName?: string | null;
  email?: string;
};

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  users: User[];
  onSuccess: () => void;
}

export default function CreateIncidentModal({
  isOpen,
  onClose,
  assets,
  users,
  onSuccess,
}: CreateIncidentModalProps) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch("/api/it-incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: Number(formData.assetId),
          title: formData.title,
          description: formData.description,
          category: formData.category,
          severity: formData.severity,
          assignedToUserId: formData.assignedToUserId
            ? Number(formData.assignedToUserId)
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.detail || "Failed to create incident");
      }

      toast.success("Incident created successfully!");
      setFormData(INITIAL_FORM_DATA);
      onClose();
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create incident";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="text-gray-900 dark:text-white p-6 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-xl font-bold">Log New Incident</h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 hover:bg-white/20 dark:hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Asset Name<span className="text-red-500">*</span>
            </label>
            <Select
              required
              value={formData.assetId}
              onChange={(e) =>
                setFormData({ ...formData, assetId: e.target.value })
              }
              disabled={submitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select an asset</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tag}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Brief description of the issue"
              disabled={submitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed description of the problem..."
              disabled={submitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <Select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                disabled={submitting}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {INCIDENT_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Severity
              </label>
              <Select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value })
                }
                disabled={submitting}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Assign To
            </label>
            <Select
              value={formData.assignedToUserId}
              onChange={(e) =>
                setFormData({ ...formData, assignedToUserId: e.target.value })
              }
              disabled={submitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {u.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              disabled={submitting}
              className="btn"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Log Incident
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

