import React, { useEffect, useState } from "react";
import type { NextPage } from "next";

import { useEffectiveUser } from "@/hooks/useEffectiveUser";

const DOMAINS = ["freight", "hotel", "bpo", "ops"] as const;
type Domain = (typeof DOMAINS)[number];

type TemplateRow = {
  id: number | string;
  name: string;
  description: string | null;
  body: string;
  isActive: boolean;
  source: "builtin" | "custom";
};

const AiTemplatesPage: NextPage = () => {
  const { effectiveUser } = useEffectiveUser();
  const [domain, setDomain] = useState<Domain>("freight");
  const [builtin, setBuiltin] = useState<TemplateRow[]>([]);
  const [custom, setCustom] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBody, setFormBody] = useState("");
  const [saving, setSaving] = useState(false);

  const canManageDomain = (userRole: string | undefined, d: Domain): boolean => {
    if (!userRole) return false;
    if (["CEO", "ADMIN", "COO", "VENTURE_HEAD"].includes(userRole)) return true;
    if (d === "freight") return ["CSR", "DISPATCHER"].includes(userRole);
    if (d === "hotel") return ["FINANCE"].includes(userRole); // placeholder for RMN/HOTEL_LEAD
    if (d === "bpo") return ["FINANCE"].includes(userRole); // placeholder for BPO_MANAGER/ACCOUNT_MANAGER
    if (d === "ops") return ["CEO", "ADMIN", "COO"].includes(userRole); // frontend follows strict ops manage subset; backend still authoritative
    return false;
  };

  const canManage = canManageDomain(effectiveUser?.role, domain);

  const loadTemplates = async (d: Domain) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/templates/list?domain=${d}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to load templates.");
        setBuiltin([]);
        setCustom([]);
        return;
      }
      const builtinRows: TemplateRow[] = (data.builtin || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        body: t.body,
        isActive: true,
        source: "builtin",
      }));
      const customRows: TemplateRow[] = (data.custom || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        body: t.body,
        isActive: !!t.isActive,
        source: "custom",
      }));
      setBuiltin(builtinRows);
      setCustom(customRows);
    } catch (err) {
      setError("Unexpected error while loading templates.");
      setBuiltin([]);
      setCustom([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates(domain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const openCreate = () => {
    setEditing(null);
    setFormName("");
    setFormDescription("");
    setFormBody("");
  };

  const openEdit = (row: TemplateRow) => {
    setEditing(row);
    setFormName(row.name);
    setFormDescription(row.description || "");
    setFormBody(row.body);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const endpoint = editing ? "/api/ai/templates/update" : "/api/ai/templates/create";
      const body = editing
        ? { id: editing.id, name: formName, description: formDescription || undefined, body: formBody }
        : { domain, name: formName, description: formDescription || undefined, body: formBody };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to save template.");
        return;
      }
      setEditing(null);
      setFormName("");
      setFormDescription("");
      setFormBody("");
      await loadTemplates(domain);
    } catch (err) {
      setError("Unexpected error while saving template.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (row: TemplateRow) => {
    if (!window.confirm("Archive this template?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/templates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to archive template.");
        return;
      }
      await loadTemplates(domain);
    } catch (err) {
      setError("Unexpected error while archiving template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">AI Templates</h1>
          <p className="text-xs text-gray-500">
            Built-in templates are read-only. Team templates are venture+domain scoped.
          </p>
        </div>

        <div className="flex gap-2 border-b pb-2">
          {DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              className={`px-3 py-1 text-sm rounded-md border ${
                domain === d ? "bg-gray-900 text-white" : "bg-white text-gray-700"
              }`}
              onClick={() => setDomain(d)}
            >
              {d === "freight" && "Freight"}
              {d === "hotel" && "Hotels"}
              {d === "bpo" && "BPO"}
              {d === "ops" && "Ops"}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-sm text-gray-600">Loading templates…</p>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Built-in templates</h2>
              {builtin.length === 0 ? (
                <p className="text-xs text-gray-500">No built-in templates for this domain.</p>
              ) : (
                <table className="w-full text-sm border border-gray-200 bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builtin.map((t) => (
                      <tr key={t.id} className="border-t border-gray-200">
                        <td className="px-3 py-1 align-top font-medium">{t.name}</td>
                        <td className="px-3 py-1 align-top text-xs text-gray-600">
                          {t.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="space-y-2 mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Team templates</h2>
                {canManage && (
                  <button
                    type="button"
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-white"
                    onClick={openCreate}
                  >
                    + Create template
                  </button>
                )}
              </div>

              {custom.length === 0 ? (
                <p className="text-xs text-gray-500">No team templates yet for this domain.</p>
              ) : (
                <table className="w-full text-sm border border-gray-200 bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      {canManage && <th className="px-3 py-2 text-left">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {custom.map((t) => (
                      <tr key={t.id} className="border-t border-gray-200">
                        <td className="px-3 py-1 align-top font-medium">{t.name}</td>
                        <td className="px-3 py-1 align-top text-xs text-gray-600">
                          {t.description}
                        </td>
                        <td className="px-3 py-1 align-top text-xs">
                          {t.isActive ? "Active" : "Archived"}
                        </td>
                        {canManage && (
                          <td className="px-3 py-1 align-top text-xs space-x-2">
                            <button
                              type="button"
                              className="underline"
                              onClick={() => openEdit(t)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="underline text-red-600"
                              onClick={() => handleArchive(t)}
                            >
                              Archive
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {canManage && (
              <section className="mt-6 border border-gray-200 rounded-md p-4 bg-white">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  {editing ? "Edit template" : "New template"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Name</label>
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <input
                      className="border rounded-md px-2 py-1 text-sm w-full"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium mb-1">Body / hint</label>
                  <textarea
                    className="border rounded-md px-2 py-1 text-sm w-full min-h-[120px]"
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    This text shapes how prompts are phrased. Avoid any language about auto-send,
                    automation, or pricing. Max ~1000 characters.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-gray-900 text-white"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? "Saving..." : "Save template"}
                  </button>
                  {editing && (
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded-md border border-gray-300 bg-white"
                      onClick={() => {
                        setEditing(null);
                        setFormName("");
                        setFormDescription("");
                        setFormBody("");
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    
  );
};

(AiTemplatesPage as any).title = "AI Templates";

export default AiTemplatesPage;
