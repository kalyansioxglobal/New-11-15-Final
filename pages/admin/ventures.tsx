import { GetServerSideProps } from "next";
import prisma from "../../lib/prisma";

// Minimal venture shape used on this admin page
export type Venture = {
  id: number;
  name: string;
  slug: string;
  type: string;
  isActive?: boolean;
  offices?: { id: number }[];
};
import { useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

interface VentureRow extends Venture {
  officeCount: number;
}

type Props = {
  ventures: VentureRow[];
  ventureTypes: string[];
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const ventures = await prisma.venture.findMany({
    include: { offices: true },
    orderBy: { name: "asc" },
  });

  const ventureTypes = ["LOGISTICS", "TRANSPORT", "HOSPITALITY", "BPO", "SAAS"];

  const venturesWithCounts: VentureRow[] = ventures.map((v: any) => ({
    ...v,
    officeCount: v.offices.length,
  }));

  return {
    props: {
      ventures: JSON.parse(JSON.stringify(venturesWithCounts)),
      ventureTypes,
    },
  };
};

function AdminVentures({ ventures, ventureTypes }: Props) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState(ventureTypes[0] ?? "LOGISTICS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ventures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, slug, type }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      setName("");
      setSlug("");
      setType(ventureTypes[0] ?? "LOGISTICS");
      setShowCreateModal(false);
      await router.replace(router.asPath);
      toast.success("Venture created successfully");
    } catch (err: any) {
      setError(err.message || "Failed to create venture");
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id: number) => {
    const confirmed = window.confirm("Mark this venture as inactive?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/ventures?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to update venture");
      await router.replace(router.asPath);
      toast.success("Venture marked inactive");
    } catch (err: any) {
      toast.error(err.message || "Error updating venture");
    }
  };

  const handleActivate = async (id: number) => {
    const confirmed = window.confirm("Mark this venture as active?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/ventures", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, isActive: true }),
      });
      if (!res.ok) throw new Error("Failed to activate venture");
      await router.replace(router.asPath);
      toast.success("Venture activated successfully");
    } catch (err: any) {
      toast.error(err.message || "Error activating venture");
    }
  };

  const hasVentures = Array.isArray(ventures) && ventures.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Ventures</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage company ventures</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn"
        >
          + Create Venture
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 w-full max-w-md shadow-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Venture</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                  setName("");
                  setSlug("");
                  setType(ventureTypes[0] ?? "LOGISTICS");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Siox Logistics"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug (unique) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="siox-logistics"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ventureTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-blue-200 dark:border-blue-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                    setName("");
                    setSlug("");
                    setType(ventureTypes[0] ?? "LOGISTICS");
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Venture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Existing Ventures
        </h2>

        {!hasVentures ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-gray-500 dark:text-gray-400">No ventures yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Slug</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Offices</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Active</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {ventures.map((v) => {
                  const isActive = Boolean(v.isActive);

                  return (
                    <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{v.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.slug}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.type}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.officeCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {isActive ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <button
                            onClick={() => handleSoftDelete(v.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(v.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition"
                          >
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

AdminVentures.title = "Admin – Ventures";

export default AdminVentures;
