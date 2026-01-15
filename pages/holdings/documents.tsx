import { GetServerSideProps } from 'next';
import { useState, useEffect, useMemo } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import type { PageWithLayout } from '@/types/page';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadingAssets(true);
        const res = await fetch('/api/holdings/assets');
        if (!res.ok) {
          throw new Error('Failed to load assets');
        }
        const data = await res.json();
        if (!cancelled) {
          const assetList = data.assets || data;
          setAssets(assetList);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load assets');
        }
      } finally {
        if (!cancelled) setLoadingAssets(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // const ventures = useMemo(() => {
  //   const ventureMap = new Map<number, Venture>();
  //   assets.forEach((a) => {
  //     if (a.venture) {
  //       ventureMap.set(a.venture.id, a.venture);
  //     }
  //   });
  //   return Array.from(ventureMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  // }, [assets]);

  // const locations = useMemo(() => {
  //   const locationSet = new Set<string>();
  //   assets.forEach((a) => {
  //     if (a.location) {
  //       locationSet.add(a.location);
  //     }
  //   });
  //   return Array.from(locationSet).sort();
  // }, [assets]);

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

  const filteredDocuments = useMemo(() => {
    if (selectedCategory === 'all') return documents;
    return documents.filter((doc) => 
      doc.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [documents, selectedCategory]);

  useEffect(() => {
    // Clear selection if current asset is not in filtered list
    if (selectedAssetId && filteredAssets.length > 0 && !filteredAssets.find(a => a.id === selectedAssetId)) {
      setSelectedAssetId(null);
    } else if (filteredAssets.length === 0) {
      setSelectedAssetId(null);
    }
  }, [filteredAssets, selectedAssetId]);

  useEffect(() => {
    if (!selectedAssetId) {
      setDocuments([]);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoadingDocuments(true);
        const res = await fetch(`/api/holdings/assets/${selectedAssetId}/documents`);
        if (!res.ok) {
          throw new Error('Failed to load documents');
        }
        const data = await res.json();
        if (!cancelled) {
          setDocuments(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load documents');
        }
      } finally {
        if (!cancelled) setLoadingDocuments(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAssetId]);

  const handleUpload = async () => {
    if (!selectedAssetId || !uploadForm.name || !selectedFile) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to upload document');
      }

      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setUploadForm({ name: '', description: '', category: '' });
      setSelectedFile(null);
      toast.success('Document uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!selectedAssetId) return;
    
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/holdings/assets/${selectedAssetId}/documents?docId=${docId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete document');
      }
      
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  // const activeFiltersCount = useMemo(() => {
  //   let count = 0;
  //   if (selectedVentureId !== 'all') count++;
  //   if (selectedLocation !== 'all') count++;
  //   if (selectedCategory !== 'all') count++;
  //   return count;
  // }, [selectedVentureId, selectedLocation, selectedCategory]);

  // const documentCategories = useMemo(() => {
  //   const cats = new Set<string>();
  //   documents.forEach((doc) => {
  //     if (doc.category) cats.add(doc.category);
  //   });
  //   return Array.from(cats).sort();
  // }, [documents]);

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoryColors: Record<string, string> = {
    deed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    contract: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    legal: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
    insurance: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
    financial: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    other: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-600',
  };

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  const getAssetTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'real_estate':
      case 'property':
        return '🏠';
      case 'vehicle':
        return '🚗';
      case 'equipment':
        return '⚙️';
      case 'investment':
        return '📈';
      default:
        return '📦';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Vault</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and organize documents for your holding assets</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          disabled={!selectedAssetId || uploading}
          className="btn disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Document
        </button>
      </div>

      {/* Filters Section */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setSelectedVentureId('all');
                setSelectedLocation('all');
                setSelectedCategory('all');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All ({activeFiltersCount})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Venture {selectedVentureId !== 'all' && <span className="text-blue-600 dark:text-blue-400">●</span>}
            </label>
            <select
              value={selectedVentureId}
              onChange={(e) => setSelectedVentureId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location {selectedLocation !== 'all' && <span className="text-blue-600 dark:text-blue-400">●</span>}
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Category {selectedCategory !== 'all' && <span className="text-blue-600 dark:text-blue-400">●</span>}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={!selectedAssetId || documents.length === 0}
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">All Categories</option>
              {documentCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div> */}

      {/* Asset Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Select Asset
          </label>
          {filteredAssets.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} available
            </span>
          )}
        </div>
        {loadingAssets ? (
          <Skeleton className="w-full h-12" />
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No assets found matching your filters.</p>
            {(selectedVentureId !== 'all' || selectedLocation !== 'all') && (
              <button
                onClick={() => {
                  setSelectedVentureId('all');
                  setSelectedLocation('all');
                }}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters to see all assets
              </button>
            )}
          </div>
        ) : (
          <select
            value={selectedAssetId || ''}
            onChange={(e) => setSelectedAssetId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm font-medium"
          >
            <option value="">-- Select an asset --</option>
            {filteredAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.type.replace(/_/g, ' ')}){asset.venture ? ` - ${asset.venture.name}` : ''}{asset.location ? ` - ${asset.location}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected Asset Info */}
      {selectedAsset && !loadingAssets && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-4xl shadow-sm">
                {getAssetTypeIcon(selectedAsset.type)}
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900 dark:text-white">{selectedAsset.name}</div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300">
                    {selectedAsset.type.replace(/_/g, ' ')}
                  </span>
                  {selectedAsset.venture && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
                      {selectedAsset.venture.name}
                    </span>
                  )}
                  {selectedAsset.location && (
                    <span className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedAsset.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{filteredDocuments.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {filteredDocuments.length === 1 ? 'Document' : 'Documents'}
                {selectedCategory !== 'all' && ` (${documents.length} total)`}
              </div>
            </div>
          </div>
        </div>
      )}

      {loadingDocuments && (
        <Skeleton className="w-full h-[85vh]" />
      )}

      {!loadingAssets && !loadingDocuments && !selectedAssetId && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Assets Available</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Create assets in Holdings to start managing their documents
          </p>
        </div>
      )}

      {/* Documents List */}
      {loadingDocuments && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-full h-24" />
          ))}
        </div>
      )}

      {!loadingAssets && !loadingDocuments && selectedAssetId && documents.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Documents Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Start organizing by uploading your first document for this asset
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload First Document
          </button>
        </div>
      )}

      {!loadingAssets && !loadingDocuments && selectedAssetId && documents.length > 0 && filteredDocuments.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Documents Match Filter</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your category filter to see more documents
          </p>
          <button
            onClick={() => setSelectedCategory('all')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear category filter
          </button>
        </div>
      )}

      {!loadingAssets && !loadingDocuments && filteredDocuments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Documents ({filteredDocuments.length}{selectedCategory !== 'all' && ` of ${documents.length}`})
              </h3>
              {selectedCategory !== 'all' && (
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Show all categories
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Uploaded By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">{doc.name}</div>
                          {doc.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{doc.description}</div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{doc.fileName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {doc.category && (
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${categoryColors[doc.category.toLowerCase()] || categoryColors.other}`}>
                          {doc.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatSize(doc.sizeBytes)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{doc.uploadedBy?.fullName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => {
          if (!uploading) {
            setShowUploadModal(false);
            setUploadForm({ name: '', description: '', category: '' });
            setSelectedFile(null);
          }
        }}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Add Document</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Document Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="e.g., Property Deed"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="Optional description"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  disabled={uploading}
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                />
                {selectedFile && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Selected: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Maximum file size: 10MB. Only PDF files are accepted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  if (!uploading) {
                    setShowUploadModal(false);
                    setUploadForm({ name: '', description: '', category: '' });
                    setSelectedFile(null);
                  }
                }}
                disabled={uploading}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadForm.name || !selectedFile}
                className="btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Upload Document
                  </>
                )}
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
