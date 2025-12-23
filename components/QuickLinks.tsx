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

  function handleDelete(id: string) {
    const updatedLinks = links.filter((l) => l.id !== id);
    saveLinks(updatedLinks);
  }

  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    setNewName("");
    setNewUrl("");
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-500">Loading quick links...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Quick Links</h3>
        {!isAdding && !editingId && (
          <button
            onClick={() => { setIsAdding(true); setError(null); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            + Add Link
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {(isAdding || editingId) && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Link name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="URL (e.g., google.com)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={editingId ? handleSaveEdit : handleAdd}
                disabled={saving || !newName.trim() || !newUrl.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingId ? "Save" : "Add"}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {links.length === 0 && !isAdding ? (
        <p className="text-xs text-gray-400 italic">
          No quick links yet. Add external links for quick access.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="group relative flex items-center"
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5 text-gray-500"
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
                {link.name}
              </a>
              <div className="hidden group-hover:flex absolute -right-1 -top-1 gap-0.5">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleEdit(link);
                  }}
                  className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50"
                  title="Edit"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(link.id);
                  }}
                  className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-red-50"
                  title="Delete"
                >
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
