import { useState, useEffect } from "react";

type QuickLink = {
  id: string;
  name: string;
  url: string;
};

export default function QuickLinks() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      const res = await fetch("/api/user/quick-links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      } else {
        setError("Failed to load quick links");
      }
    } catch (err) {
      console.error("Failed to fetch quick links:", err);
      setError("Failed to load quick links");
    } finally {
      setLoading(false);
    }
  }

  async function saveLinks(updatedLinks: QuickLink[]): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/quick-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updatedLinks }),
      });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || updatedLinks);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to save link");
        return false;
      }
    } catch (err) {
      console.error("Failed to save quick links:", err);
      setError("Failed to save link. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newUrl.trim()) return;
    
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    const newLink: QuickLink = {
      id: Date.now().toString(),
      name: newName.trim(),
      url,
    };
    
    const success = await saveLinks([...links, newLink]);
    if (success) {
      setNewName("");
      setNewUrl("");
      setIsAdding(false);
    }
  }

  function handleEdit(link: QuickLink) {
    setEditingId(link.id);
    setNewName(link.name);
    setNewUrl(link.url);
    setError(null);
  }

  async function handleSaveEdit() {
    if (!newName.trim() || !newUrl.trim() || !editingId) return;
    
    let url = newUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    
    const updatedLinks = links.map((l) =>
      l.id === editingId ? { ...l, name: newName.trim(), url } : l
    );
    
    const success = await saveLinks(updatedLinks);
    if (success) {
      setEditingId(null);
      setNewName("");
      setNewUrl("");
    }
  }

  function handleDeleteClick(id: string) {
    setDeleteConfirmId(id);
    setError(null);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    
    setDeleting(true);
    setError(null);
    try {
      const updatedLinks = links.filter((l) => l.id !== deleteConfirmId);
      const success = await saveLinks(updatedLinks);
      if (success) {
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error("Failed to delete link:", err);
      setError("Failed to delete link. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleCancelDelete() {
    setDeleteConfirmId(null);
  }

  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    setNewName("");
    setNewUrl("");
    setError(null);
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-gray-500">Loading quick links...</div>
      </div>
    );
  }

  const linkToDelete = deleteConfirmId ? links.find((l) => l.id === deleteConfirmId) : null;

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Quick Links</h3>
          {!isAdding && !editingId && (
            <button
              onClick={() => { setIsAdding(true); setError(null); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Link
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {(isAdding || editingId) && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Link Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Google Drive"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim() && newUrl.trim()) {
                      editingId ? handleSaveEdit() : handleAdd();
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  URL
                </label>
                <input
                  type="text"
                  placeholder="e.g., drive.google.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim() && newUrl.trim()) {
                      editingId ? handleSaveEdit() : handleAdd();
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={editingId ? handleSaveEdit : handleAdd}
                  disabled={saving || !newName.trim() || !newUrl.trim()}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Link"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {links.length === 0 && !isAdding ? (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            <p className="text-sm text-gray-500 mb-1">No quick links yet</p>
            <p className="text-xs text-gray-400">Add external links for quick access</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {links.map((link) => (
              <div
                key={link.id}
                className="group relative"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow"
                >
                  <svg
                    className="w-4 h-4 text-gray-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span className="truncate max-w-[150px]">{link.name}</span>
                </a>
                <div className="hidden group-hover:flex absolute -right-2 -top-2 gap-1 z-10">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEdit(link);
                    }}
                    className="p-1.5 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    title="Edit link"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteClick(link.id);
                    }}
                    className="p-1.5 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-red-50 hover:border-red-300 transition-colors"
                    title="Delete link"
                  >
                    <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && linkToDelete && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Delete Quick Link</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <span className="font-medium text-gray-900">&quot;{linkToDelete.name}&quot;</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
