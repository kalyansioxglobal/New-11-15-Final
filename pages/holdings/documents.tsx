import { GetServerSideProps } from 'next';
import { useState, useEffect, useMemo } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';
import { Skeleton } from '@/components/ui/Skeleton';

type Venture = {
  id: number;
  name: string;
};

type Asset = {
  id: number;
  name: string;
  type: string;
  location: string | null;
  ventureId: number | null;
  venture: Venture | null;
};

type Document = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: { id: number; fullName: string } | null;
  createdAt: string;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  const allowedRoles = ['CEO', 'ADMIN', 'COO', 'FINANCE'];
  if (!allowedRoles.includes(user.role)) {
    return { redirect: { destination: '/overview', permanent: false } };
  }
  return { props: {} };
};

function HoldingsDocumentsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [selectedVentureId, setSelectedVentureId] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/holdings/assets')
      .then((r) => r.json())
      .then((data) => {
        const assetList = data.assets || data;
        setAssets(assetList);
        if (assetList.length > 0) {
          setSelectedAssetId(assetList[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const ventures = useMemo(() => {
    const ventureMap = new Map<number, Venture>();
    assets.forEach((a) => {
      if (a.venture) {
        ventureMap.set(a.venture.id, a.venture);
      }
    });
    return Array.from(ventureMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [assets]);

  const locations = useMemo(() => {
    const locationSet = new Set<string>();
    assets.forEach((a) => {
      if (a.location) {
        locationSet.add(a.location);
      }
    });
    return Array.from(locationSet).sort();
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (selectedVentureId !== 'all') {
        if (selectedVentureId === 'unassigned') {
          if (a.ventureId !== null) return false;
        } else {
          if (a.ventureId !== Number(selectedVentureId)) return false;
        }
      }
      if (selectedLocation !== 'all') {
        if (a.location !== selectedLocation) return false;
      }
      return true;
    });
  }, [assets, selectedVentureId, selectedLocation]);

  useEffect(() => {
    if (filteredAssets.length > 0 && !filteredAssets.find(a => a.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id);
    } else if (filteredAssets.length === 0) {
      setSelectedAssetId(null);
    }
  }, [filteredAssets, selectedAssetId]);

  useEffect(() => {
    if (!selectedAssetId) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    fetch(`/api/holdings/assets/${selectedAssetId}/documents`)
      .then((r) => r.json())
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, [selectedAssetId]);

  const handleUpload = async () => {
    if (!selectedAssetId || !uploadForm.name || !selectedFile) return;
    
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description || '');
      formData.append('category', uploadForm.category || '');
      formData.append('file', selectedFile);

      const res = await fetch(`/api/holdings/assets/${selectedAssetId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.detail || 'Failed to upload document');
      }

      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setUploadForm({ name: '', description: '', category: '' });
      setSelectedFile(null);
      setUploadError(null);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!selectedAssetId || !confirm('Delete this document?')) return;
    const res = await fetch(`/api/holdings/assets/${selectedAssetId}/documents?docId=${docId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryColors: Record<string, string> = {
    deed: 'bg-blue-100 text-blue-800',
    contract: 'bg-purple-100 text-purple-800',
    legal: 'bg-red-100 text-red-800',
    insurance: 'bg-green-100 text-green-800',
    financial: 'bg-amber-100 text-amber-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'REAL_ESTATE':
      case 'PROPERTY':
        return '🏠';
      case 'VEHICLE':
        return '🚗';
      case 'EQUIPMENT':
        return '⚙️';
      case 'INVESTMENT':
        return '📈';
      default:
        return '📦';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Document Vault</h1>
          <p className="text-sm text-gray-500">Manage documents for holding assets</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={!selectedAssetId}
          className="btn"
        >
          Add Document
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Venture</label>
            <select
              value={selectedVentureId}
              onChange={(e) => setSelectedVentureId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Ventures</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Asset</label>
            <select
              value={selectedAssetId || ''}
              onChange={(e) => setSelectedAssetId(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              disabled={filteredAssets.length === 0}
            >
              {filteredAssets.length === 0 ? (
                <option value="">No assets found</option>
              ) : (
                filteredAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
          <span>{filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} found</span>
          {selectedVentureId !== 'all' || selectedLocation !== 'all' ? (
            <button
              onClick={() => {
                setSelectedVentureId('all');
                setSelectedLocation('all');
              }}
              className="text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {selectedAsset && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              {getAssetTypeIcon(selectedAsset.type)}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{selectedAsset.name}</div>
              <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                <span>{selectedAsset.type}</span>
                {selectedAsset.venture && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {selectedAsset.venture.name}
                    </span>
                  </>
                )}
                {selectedAsset.location && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {selectedAsset.location}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{documents.length}</div>
              <div className="text-sm text-gray-500">Documents</div>
            </div>
          </div>
        </div>
      )}

      {loading && <Skeleton className="w-full h-[85vh]" />}

      {!loading && !selectedAssetId && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <div className="text-4xl mb-2">📋</div>
          <div className="text-gray-500">No assets available</div>
          <div className="text-sm text-gray-400">Create assets in Holdings to manage their documents</div>
        </div>
      )}

      {!loading && selectedAssetId && documents.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-gray-500">No documents yet</div>
          <div className="text-sm text-gray-400">Add your first document to this asset</div>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Document</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded By</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3">
                    <div className="font-medium">{doc.name}</div>
                    {doc.description && (
                      <div className="text-xs text-gray-500">{doc.description}</div>
                    )}
                    <div className="text-xs text-gray-400">{doc.fileName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {doc.category && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[doc.category.toLowerCase()] || categoryColors.other}`}>
                        {doc.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatSize(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.uploadedBy?.fullName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm mr-3"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Document</h2>
            
            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {uploadError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Property Deed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select category</option>
                  <option value="Deed">Deed</option>
                  <option value="Contract">Contract</option>
                  <option value="Legal">Legal</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Financial">Financial</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    setUploadError(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum file size: 10MB. Only PDF files are accepted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ name: '', description: '', category: '' });
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.name || !selectedFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

(HoldingsDocumentsPage as PageWithLayout).title = 'Document Vault';
export default HoldingsDocumentsPage;
