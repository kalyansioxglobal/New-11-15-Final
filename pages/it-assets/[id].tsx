import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Venture = { id: number; name: string; type: string };
type Office = { id: number; name: string; ventureId: number };
type User = { id: number; fullName: string };
type ITAsset = {
  id: number;
  tag: string;
  type: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  notes: string | null;
  ventureId: number;
  officeId: number | null;
  assignedToUserId: number | null;
  assignedSince: string | null;
  createdAt: string;
  updatedAt: string;
  venture?: { id: number; name: string };
  office?: { id: number; name: string };
  assignedToUser?: User;
  incidents?: Array<{
    id: number;
    title: string;
    status: string;
    severity: string;
    createdAt: string;
  }>;
  history?: Array<{
    id: number;
    action: string;
    createdAt: string;
    notes: string | null;
    fromUserId: number | null;
    toUserId: number | null;
  }>;
};

function ITAssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [asset, setAsset] = useState<ITAsset | null>(null);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    tag: '',
    type: '',
    make: '',
    model: '',
    serialNumber: '',
    status: 'AVAILABLE',
    purchaseDate: '',
    warrantyExpiry: '',
    notes: '',
    ventureId: '',
    officeId: '',
    assignedToUserId: '',
    
  });

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    // Check if edit mode is requested via query param
    const editParam = router.query.edit === 'true';
    if (editParam) {
      setIsEditing(true);
    }

    let cancelled = false;
    async function load() {
      try {
        const [assetRes, vRes, oRes, usersRes] = await Promise.all([
          fetch(`/api/it-assets/${id}`),
          fetch('/api/ventures'),
          fetch('/api/offices'),
          fetch('/api/admin/users?limit=500'),
        ]);

        if (!cancelled) {
          if (assetRes.ok) {
            const assetData = await assetRes.json();
            setAsset(assetData);
            setFormData({
              tag: assetData.tag || '',
              type: assetData.type || '',
              make: assetData.make || '',
              model: assetData.model || '',
              serialNumber: assetData.serialNumber || '',
              status: assetData.status || 'AVAILABLE',
              purchaseDate: assetData.purchaseDate ? assetData.purchaseDate.split('T')[0] : '',
              warrantyExpiry: assetData.warrantyExpiry ? assetData.warrantyExpiry.split('T')[0] : '',
              notes: assetData.notes || '',
              ventureId: String(assetData.ventureId || ''),
              officeId: String(assetData.officeId || ''),
              assignedToUserId: String(assetData.assignedToUserId || ''),
            });
          } else {
            setError('Asset not found');
          }

          if (vRes.ok) setVentures(await vRes.json());
          if (oRes.ok) setOffices(await oRes.json());
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            // API returns { users: [...], page, limit, totalCount, totalPages }
            // Users have 'name' field (which is fullName) in the response
            const usersList = usersData.users || [];
            setUsers(usersList.map((u: any) => ({
              id: u.id,
              fullName: u.name || u.fullName || '',
            })));
          }
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load asset');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, router.query.edit]);

  const filteredOffices = offices.filter(
    (o) => !formData.ventureId || o.ventureId === Number(formData.ventureId)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string') return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/it-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: formData.tag,
          type: formData.type,
          make: formData.make || null,
          model: formData.model || null,
          serialNumber: formData.serialNumber || null,
          status: formData.status,
          purchaseDate: formData.purchaseDate || null,
          warrantyExpiry: formData.warrantyExpiry || null,
          notes: formData.notes || null,
          assignedToUserId: formData.assignedToUserId ? Number(formData.assignedToUserId) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = "Failed to update asset";
        if (data.error === "FORBIDDEN") {
          errorMessage = "You don't have permission to update this asset";
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        }
        throw new Error(errorMessage);
      }

      const updated = await res.json();
      setAsset(updated);
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update asset");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!id || typeof id !== 'string' || !assignUserId) return;

    setAssigning(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/it-assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: Number(id),
          userId: Number(assignUserId),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        let errorMessage = "Failed to assign asset";
        if (data.error === "VALIDATION_ERROR") {
          errorMessage = data.detail || "Validation error";
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        }
        throw new Error(errorMessage);
      }

      const updated = await res.json();
      setAsset(updated);
      setShowAssignModal(false);
      setAssignUserId("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to assign asset");
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <Skeleton className="w-full h-full" />
    );
  }

  if (error && !asset) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/it?tab=assets")}>
          ← Back to IT Assets
        </Button>
        <Alert variant="error" message={error} />
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/it?tab=assets")}
          className="-ml-1"
        >
          ← Back to IT Assets
        </Button>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a2 2 0 11-4 0 2 2 0 014 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Assign Asset
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                router.push(`/it-assets/${id}?edit=true`, undefined, { shallow: true });
                setIsEditing(true);
              }}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 rounded-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">IT Asset: {asset.tag}</h1>
                  <p className="text-indigo-100 text-sm">ID: #{asset.id}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                asset.status === 'AVAILABLE' ? 'bg-emerald-500 text-white' :
                asset.status === 'ASSIGNED' ? 'bg-indigo-500 text-white' :
                asset.status === 'MAINTENANCE' ? 'bg-amber-500 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {asset.status}
              </span>
            </div>
          </div>
        </div>

        {error && <Alert variant="error" message={error} className="mb-4" />}
        {success && <Alert variant="success" message="Asset updated successfully!" className="mb-4" />}

        {isEditing ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Asset
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-xs mb-1 text-gray-500">Tag *</label>
              <input
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">Type *</label>
              <input
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Make</label>
                <input
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Model</label>
                <input
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">Serial Number</label>
              <input
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RETIRED">RETIRED</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Assigned To</label>
                <select
                  name="assignedToUserId"
                  value={formData.assignedToUserId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Purchase Date</label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs mb-1 text-gray-500">Warranty Expiry</label>
                <input
                  type="date"
                  name="warrantyExpiry"
                  value={formData.warrantyExpiry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[80px]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  router.push(`/it-assets/${id}`, undefined, { shallow: true });
                  setIsEditing(false);
                  // Reset form data
                  if (asset) {
                    setFormData({
                      tag: asset.tag || '',
                      type: asset.type || '',
                      make: asset.make || '',
                      model: asset.model || '',
                      serialNumber: asset.serialNumber || '',
                      status: asset.status || 'AVAILABLE',
                      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
                      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
                      notes: asset.notes || '',
                      ventureId: String(asset.ventureId || ''),
                      officeId: String(asset.officeId || ''),
                      assignedToUserId: String(asset.assignedToUserId || ''),
                    });
                  }
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Asset Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tag</label>
                    <p className="font-mono text-lg font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{asset.tag}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type</label>
                    <p className="text-lg text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{asset.type}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Make</label>
                    <p className="text-base text-gray-900">{asset.make || <span className="text-gray-400">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Model</label>
                    <p className="text-base text-gray-900">{asset.model || <span className="text-gray-400">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Serial Number</label>
                    <p className="text-base text-gray-900 font-mono">{asset.serialNumber || <span className="text-gray-400">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Venture</label>
                    <p className="text-base text-gray-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {asset.venture?.name || <span className="text-gray-400">Not assigned</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Office</label>
                    <p className="text-base text-gray-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {asset.office?.name || <span className="text-gray-400">Not assigned</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned To</label>
                    <p className="text-base text-gray-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {asset.assignedToUser?.fullName || <span className="text-gray-400">Unassigned</span>}
                    </p>
                    {asset.assignedSince && (
                      <p className="text-xs text-gray-500 ml-6 mt-1">Since {formatDate(asset.assignedSince)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Purchase Date
                    </label>
                    <p className="text-base text-gray-900">{formatDate(asset.purchaseDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Warranty Expiry
                    </label>
                    <p className="text-base text-gray-900">{formatDate(asset.warrantyExpiry)}</p>
                  </div>
                </div>

                {asset.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Asset History Card */}
            {asset.history && asset.history.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Asset History ({asset.history.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {asset.history.map((entry) => {
                      const fromUser = entry.fromUserId ? users.find(u => u.id === entry.fromUserId) : null;
                      const toUser = entry.toUserId ? users.find(u => u.id === entry.toUserId) : null;
                      
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                            entry.action === 'ASSIGNED' ? 'bg-indigo-500' :
                            entry.action === 'RETURNED' ? 'bg-green-500' :
                            'bg-gray-400'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-900">{entry.action}</span>
                              <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                            </div>
                            {entry.action === 'ASSIGNED' && toUser && (
                              <p className="text-xs text-gray-600">
                                Assigned to <span className="font-medium">{toUser.fullName}</span>
                                {fromUser && ` (from ${fromUser.fullName})`}
                              </p>
                            )}
                            {entry.action === 'RETURNED' && fromUser && (
                              <p className="text-xs text-gray-600">
                                Returned from <span className="font-medium">{fromUser.fullName}</span>
                              </p>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{entry.notes}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Related Incidents Card */}
            {asset.incidents && asset.incidents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Related Incidents ({asset.incidents.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {asset.incidents.map((incident) => (
                      <Link
                        key={incident.id}
                        href={`/it?tab=incidents`}
                        className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 group-hover:text-indigo-700">{incident.title}</span>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {incident.status}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(incident.createdAt)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            incident.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            incident.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            incident.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {incident.severity}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assign Asset Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Assign Asset</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {error && <Alert variant="error" message={error} />}
                {success && <Alert variant="success" message="Asset assigned successfully!" />}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to User *
                  </label>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setAssignUserId("");
                      setError(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAssign}
                    disabled={assigning || !assignUserId}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {assigning ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Assigning...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a2 2 0 11-4 0 2 2 0 014 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Assign Asset
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
ITAssetDetailPage.title = "IT Asset Details";
export default ITAssetDetailPage;
