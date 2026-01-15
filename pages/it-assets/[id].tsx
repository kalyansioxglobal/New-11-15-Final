import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

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
    fromUser?: { id: number; fullName: string } | null;
    toUser?: { id: number; fullName: string } | null;
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
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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
            toast.error('Asset not found');
            // setError('Asset not found');
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
        if (!cancelled) toast.error('Failed to load asset');
        // setError('Failed to load asset');
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

  console.log(users);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || typeof id !== 'string') return;

    // Validation: If assigned to a user, status cannot be AVAILABLE
    if (formData.assignedToUserId && formData.status === 'AVAILABLE') {
      toast.error('Status cannot be AVAILABLE when asset is assigned to a user. Please change the status to ASSIGNED or another appropriate status.');
      return;
    }

    setSaving(true);
    setError(null);

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
        toast.error(errorMessage);
        // throw new Error(errorMessage);
      }

      const updated = await res.json();
      setAsset(updated);
      setIsEditing(false);
      toast.success('Asset updated successfully!');
    } catch (e: any) {
      toast.error(e.message || "Failed to update asset");
      // setError(e.message || "Failed to update asset");
    } finally {
      setSaving(false);
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
      <div className="p-6 space-y-4 dark:bg-gray-900 min-h-screen">
        <button className="text-sm text-white" onClick={() => router.push("/it?tab=assets")}>
          ← Back to IT Assets
        </button>
        <div className="text-sm text-red-500">{error}</div>
        {/* <Alert variant="error" message={error} /> */}
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      <div className="flex items-center justify-between">
        <button className="text-sm text-gray-900 hover:text-black dark:text-white dark:hover:text-gray-300"
          onClick={() => router.push("/it?tab=assets")}
        >
          ← Back to IT Assets
        </button>
        {!isEditing && (
          <Button 
            size="sm" 
            onClick={() => {
              router.push(`/it-assets/${id}?edit=true`, undefined, { shallow: true });
              setIsEditing(true);
            }}
            className="btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        )}
      </div>

      <div className="max-w-5xl mx-auto">
        {error && <div className="text-sm text-red-500">{error}</div>}

        {isEditing ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Edit IT Asset</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update asset information and details</p>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Tag <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="tag"
                    type="text"
                    value={formData.tag}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    placeholder="e.g., LAPTOP-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="type"
                    type="text"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Make / Brand
                    </label>
                    <input
                      name="make"
                      type="text"
                      value={formData.make}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                      placeholder="e.g., Dell, HP, Apple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Model
                    </label>
                    <input
                      name="model"
                      type="text"
                      value={formData.model}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                      placeholder="e.g., XPS 15, MacBook Pro"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Serial Number
                  </label>
                  <input
                    name="serialNumber"
                    type="text"
                    value={formData.serialNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all font-mono"
                    placeholder="Enter serial number"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border ${
                        formData.assignedToUserId && formData.status === 'AVAILABLE'
                          ? 'border-red-500 dark:border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      } text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all`}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="RETIRED">RETIRED</option>
                    </select>
                    {formData.assignedToUserId && formData.status === 'AVAILABLE' && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Status cannot be AVAILABLE when asset is assigned to a user.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Assigned To
                    </label>
                    <select
                      name="assignedToUserId"
                      value={formData.assignedToUserId}
                      onChange={(e) => {
                        handleChange(e);
                        // Auto-update status to ASSIGNED if assigning to a user
                        if (e.target.value && formData.status === 'AVAILABLE') {
                          setFormData(prev => ({ ...prev, status: 'ASSIGNED' }));
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      name="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Warranty Expiry
                    </label>
                    <input
                      type="date"
                      name="warrantyExpiry"
                      value={formData.warrantyExpiry}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                    placeholder="Additional details about the asset..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Asset Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tag</label>
                    <p className="font-mono text-lg font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">{asset.tag}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Type</label>
                    <p className="text-lg text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">{asset.type}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Make</label>
                    <p className="text-base text-gray-900 dark:text-white">{asset.make || <span className="text-gray-400 dark:text-gray-500">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Model</label>
                    <p className="text-base text-gray-900 dark:text-white">{asset.model || <span className="text-gray-400 dark:text-gray-500">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Serial Number</label>
                    <p className="text-base text-gray-900 dark:text-white font-mono">{asset.serialNumber || <span className="text-gray-400 dark:text-gray-500">Not specified</span>}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Venture</label>
                    <p className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {asset.venture?.name || <span className="text-gray-400 dark:text-gray-500">Not assigned</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Office</label>
                    <p className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {asset.office?.name || <span className="text-gray-400 dark:text-gray-500">Not assigned</span>}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Assigned To</label>
                    <p className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {asset.assignedToUser?.fullName || <span className="text-gray-400 dark:text-gray-500">Unassigned</span>}
                    </p>
                    {asset.assignedSince && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 ml-6 mt-1">Since {formatDate(asset.assignedSince)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Purchase Date
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{formatDate(asset.purchaseDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Warranty Expiry
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{formatDate(asset.warrantyExpiry)}</p>
                  </div>
                </div>

                {asset.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Notes
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Asset History Card */}
            {asset.history && asset.history.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Asset History ({(asset as any)._historyMeta?.totalCount || asset.history.length})
                    </h2>
                    {(asset as any)._historyMeta?.hasMore && !showAllHistory && (
                      <button
                        onClick={async () => {
                          setLoadingHistory(true);
                          try {
                            const res = await fetch(`/api/it-assets/${id}/history`);
                            if (res.ok) {
                              const data = await res.json();
                              setAllHistory(data.history || []);
                              setShowAllHistory(true);
                            }
                          } catch (err) {
                            console.error('Failed to load all history:', err);
                            toast.error('Failed to load all history');
                          } finally {
                            setLoadingHistory(false);
                          }
                        }}
                        disabled={loadingHistory}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingHistory ? 'Loading...' : `Show all (${(asset as any)._historyMeta?.totalCount || 0} entries)`}
                      </button>
                    )}
                    {showAllHistory && (
                      <button
                        onClick={() => {
                          setShowAllHistory(false);
                          setAllHistory([]);
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
                      >
                        Show recent only
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {(showAllHistory ? allHistory : asset.history).map((entry) => {
                      const fromUser = entry.fromUser || (entry.fromUserId ? users.find(u => u.id === entry.fromUserId) : null);
                      const toUser = entry.toUser || (entry.toUserId ? users.find(u => u.id === entry.toUserId) : null);
                      
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                            entry.action === 'ASSIGNED' ? 'bg-indigo-500 dark:bg-indigo-400' :
                            entry.action === 'REASSIGNED' ? 'bg-purple-500 dark:bg-purple-400' :
                            entry.action === 'RETURNED' ? 'bg-green-500 dark:bg-green-400' :
                            entry.action === 'INCIDENT_CREATED' ? 'bg-amber-500 dark:bg-amber-400' :
                            entry.action === 'INCIDENT_RESOLVED' ? 'bg-blue-500 dark:bg-blue-400' :
                            'bg-gray-400 dark:bg-gray-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm text-gray-900 dark:text-white">{entry.action}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(entry.createdAt)}</span>
                            </div>
                            {entry.action === 'ASSIGNED' && toUser && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Assigned to <span className="font-medium">{toUser.fullName}</span>
                                {fromUser && ` (from ${fromUser.fullName})`}
                              </p>
                            )}
                            {entry.action === 'REASSIGNED' && toUser && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Reassigned to <span className="font-medium">{toUser.fullName}</span>
                                {fromUser && ` (from ${fromUser.fullName})`}
                              </p>
                            )}
                            {entry.action === 'RETURNED' && fromUser && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Returned from <span className="font-medium">{fromUser.fullName}</span>
                              </p>
                            )}
                            {entry.action === 'INCIDENT_CREATED' && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {toUser ? `Assigned to ${toUser.fullName} due to incident` : 'Incident created'}
                                {fromUser && toUser && ` (transferred from ${fromUser.fullName})`}
                              </p>
                            )}
                            {entry.action === 'INCIDENT_RESOLVED' && (
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Asset made available after incident resolution
                                {fromUser && ` (was assigned to ${fromUser.fullName})`}
                              </p>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{entry.notes}"</p>
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{incident.title}</span>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                            incident.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            incident.severity === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                            incident.severity === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
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

      </div>
    </div>
  );
}
ITAssetDetailPage.title = "IT Asset Details";
export default ITAssetDetailPage;
