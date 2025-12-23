import { GetServerSideProps } from "next";
import prisma from "../../lib/prisma";
import { getEffectiveUser } from '@/lib/effectiveUser';
import { getUserScope } from '@/lib/scope';
import { useState } from "react";
import { useRouter } from "next/router";

type TemplateRow = {
  id: number;
  name: string;
  domain: string;
  isActive: boolean;
  updatedAt: string;
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return { redirect: { destination: '/overview', permanent: false } };
  }

  const scope = getUserScope(user);

  const ventureWhere = scope.allVentures ? {} : { id: { in: user.ventureIds } };
  const ventures = await prisma.venture.findMany({ where: ventureWhere, orderBy: { name: 'asc' } });

  const tplWhere: any = {};
  if (!scope.allVentures) tplWhere.ventureId = { in: user.ventureIds };

  const templates = await prisma.aiDraftTemplate.findMany({
    where: tplWhere,
    include: { venture: true },
    orderBy: { updatedAt: "desc" },
  });

  return { props: { templates: JSON.parse(JSON.stringify(templates)), ventures: JSON.parse(JSON.stringify(ventures)), user: JSON.parse(JSON.stringify(user)) } };
};

function AdminAiTemplates({ templates, ventures, user }: { templates: TemplateRow[]; ventures: any[]; user: any }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-templates/${id}`);
      const data = await res.json();
      setEditing(data.template);
      setShowForm(true);
    } catch (err) {
      setPageError("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="ai-templates">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>AI Templates</h1>
        <button onClick={openCreate} style={{ padding: "0.5rem 0.75rem" }}>
          Create Template
        </button>
      </header>

      <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Active</th>
            <th style={thStyle}>Updated</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{t.name}</td>
              <td style={tdStyle}>{t.domain}</td>
              <td style={tdStyle}>{t.isActive ? "Yes" : "No"}</td>
              <td style={tdStyle}>{new Date(t.updatedAt).toLocaleString()}</td>
              <td style={tdStyle}>
                <button onClick={() => openEdit(t.id)} style={{ marginRight: 8 }}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pageError && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{pageError}</div>
      )}

      {showForm && (
        <TemplateModal
          onClose={() => setShowForm(false)}
          editing={editing}
          ventures={ventures}
          user={user}
          onSaved={() => {
            setShowForm(false);
            router.replace(router.asPath);
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({ onClose, editing, onSaved, ventures, user }: { onClose: () => void; editing: any | null; onSaved: () => void; ventures: any[]; user: any }) {
  const [name, setName] = useState(editing?.name || "");
  const [domain, setDomain] = useState(editing?.domain || "freight");
  const [body, setBody] = useState(editing?.body || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [isActive, setIsActive] = useState(Boolean(editing?.isActive));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ventureId, setVentureId] = useState<number | null>(() => {
    if (editing && editing.ventureId) return editing.ventureId;
    if (ventures && ventures.length === 1) return ventures[0].id;
    if (ventures && ventures.length > 0) return ventures[0].id;
    return null;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!ventureId) throw new Error('Venture must be selected');

      if (editing) {
        const res = await fetch(`/api/admin/ai-templates/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain, body, description, isActive, ventureId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Update failed");
        }
      } else {
        const res = await fetch(`/api/admin/ai-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain, body, description, ventureId }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "Create failed");
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = async () => {
    if (!editing) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/ai-templates/${editing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">{editing ? "Edit Template" : "Create Template"}</h3>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>

        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Domain</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="freight">freight</option>
              <option value="hotel">hotel</option>
              <option value="bpo">bpo</option>
              <option value="ops">ops</option>
            </select>
          </div>

          {/* Venture selector: show only if user has access to more than one venture */}
          {ventures && ventures.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Venture</label>
              <select
                value={ventureId ?? ''}
                onChange={(e) => setVentureId(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select venture</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body"
              rows={6}
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              id="isActive"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
            >
              Cancel
            </button>

            {editing && (
              <div className="ml-auto">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={performDelete}
                      className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminAiTemplates;

const thStyle: React.CSSProperties = { textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #eee" };
const tdStyle: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid #f6f6f6" };
 
