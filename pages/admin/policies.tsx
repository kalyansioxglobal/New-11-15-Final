import React, { useState } from "react";
import { GetServerSideProps } from "next";
import type { UserRole } from "@/lib/permissions";
import prisma from "../../lib/prisma";
import toast from "react-hot-toast";

// Lightweight local copies of Policy-related types to avoid tight coupling
// to the Prisma client type definitions.
type PolicyType = "INSURANCE" | "LEASE" | "CONTRACT" | "LICENSE" | "PERMIT" | "OTHER";

type PolicyStatus = "ACTIVE" | "PENDING" | "EXPIRED" | "CANCELLED";

type Venture = {
  id: number;
  name: string;
};

type Office = {
  id: number;
  name: string;
  ventureId: number | null;
};

type User = {
  id: number;
  fullName: string | null;
};

type Policy = {
  id: number;
  ventureId: number;
  officeId: number | null;
  name: string;
  type: PolicyType;
  provider: string | null;
  policyNo: string | null;
  startDate: string | null;
  endDate: string | null;
  status: PolicyStatus;
  fileUrl: string | null;
  notes: string | null;
};

import { useRouter } from "next/router";
import { useTestMode } from "@/contexts/TestModeContext";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { canEditPolicies } from "@/lib/permissions";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";

type PolicyWithRelations = Policy & {
  venture: Venture;
  office: Office | null;
  creator: User | null;
};

type Props = {
  policies: PolicyWithRelations[];
  ventures: Venture[];
  offices: Office[];
  policyTypes: PolicyType[];
  statusOptions: PolicyStatus[];
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user || !canEditPolicies(user.role)) {
    return { redirect: { destination: '/policies', permanent: false } };
  }

  const [policies, ventures, offices] = await Promise.all([
    prisma.policy.findMany({
      include: { venture: true, office: true, creator: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.venture.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.office.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const policyTypes: PolicyType[] = [
    "INSURANCE",
    "LEASE",
    "CONTRACT",
    "LICENSE",
    "PERMIT",
    "OTHER",
  ];

  const statusOptions: PolicyStatus[] = [
    "ACTIVE",
    "PENDING",
    "EXPIRED",
    "CANCELLED",
  ];

  return {
    props: {
      policies: JSON.parse(JSON.stringify(policies)),
      ventures: JSON.parse(JSON.stringify(ventures)),
      offices: JSON.parse(JSON.stringify(offices)),
      policyTypes,
      statusOptions,
    },
  };
};

export default function AdminPolicies({
  policies,
  ventures,
  offices,
  policyTypes,
  statusOptions,
}: Props) {
  const router = useRouter();
  const { testMode } = useTestMode();
  const { effectiveUser } = useEffectiveUser();
  const role = (effectiveUser?.role || 'EMPLOYEE') as UserRole;
  const canEdit = canEditPolicies(role);

  const [ventureId, setVentureId] = useState<number | "">("");
  const [officeId, setOfficeId] = useState<number | "">("");
  const [name, setName] = useState("");
  const [type, setType] = useState<PolicyType>("INSURANCE");
  const [provider, setProvider] = useState("");
  const [policyNo, setPolicyNo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<PolicyStatus>("ACTIVE");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: any = {
        ventureId: Number(ventureId),
        officeId: officeId === "" ? null : Number(officeId),
        name,
        type,
        provider: provider || null,
        policyNo: policyNo || null,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
        fileUrl: fileUrl || null,
        notes: notes || null,
      };

      if (testMode) data.isTest = true;

      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || `Request failed with ${res.status}`);
      }

      setName("");
      setProvider("");
      setPolicyNo("");
      setStartDate("");
      setEndDate("");
      setFileUrl("");
      setNotes("");
      setVentureId("");
      setOfficeId("");
      setType("INSURANCE");
      setStatus("ACTIVE");
      setShowCreateModal(false);

      await router.replace(router.asPath);
      toast.success("Policy created successfully");
    } catch (err: any) {
      setError(err.message || "Failed to create policy");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this policy?")) return;
    try {
      const res = await fetch(`/api/admin/policies?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await router.replace(router.asPath);
      toast.success("Policy deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Error deleting policy");
    }
  };

  const handleStatusChange = async (id: number, newStatus: PolicyStatus) => {
    try {
      const res = await fetch("/api/admin/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await router.replace(router.asPath);
      toast.success("Policy status updated");
    } catch (err: any) {
      toast.error(err.message || "Error updating policy");
    }
  };

  const getStatusColor = (s: PolicyStatus) => {
    switch (s) {
      case "ACTIVE": return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "PENDING": return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "EXPIRED": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      case "CANCELLED": return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const resetForm = () => {
    setName("");
    setProvider("");
    setPolicyNo("");
    setStartDate("");
    setEndDate("");
    setFileUrl("");
    setNotes("");
    setVentureId("");
    setOfficeId("");
    setType("INSURANCE");
    setStatus("ACTIVE");
    setError(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Policies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage company policies and documents</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm hover:shadow"
          >
            + Create Policy
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-sm">
          You don&apos;t have permission to create or edit policies.
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-6 w-full max-w-4xl shadow-2xl border border-blue-200 dark:border-blue-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Policy</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Venture <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ventureId}
                    onChange={(e) => setVentureId(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select venture</option>
                    {ventures.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Office
                  </label>
                  <select
                    value={officeId}
                    onChange={(e) => setOfficeId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">- None -</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="General Liability 2025"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PolicyType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {policyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="Geico, landlord name..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Policy #
                  </label>
                  <input
                    type="text"
                    value={policyNo}
                    onChange={(e) => setPolicyNo(e.target.value)}
                    placeholder="POL-12345"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PolicyStatus)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    File URL
                  </label>
                  <input
                    type="text"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-blue-200 dark:border-blue-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
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
                  {loading ? "Creating..." : "Create Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Existing Policies
        </h2>

        {policies.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-gray-500 dark:text-gray-400">No policies yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Venture / Office</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Dates</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {policies.map((p) => {
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                          {p.policyNo && <div className="text-xs text-gray-500 dark:text-gray-400">#{p.policyNo}</div>}
                          {p.provider && <div className="text-xs text-gray-500 dark:text-gray-400">{p.provider}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.type}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">{p.venture?.name}</div>
                          {p.office && <div className="text-xs text-gray-500 dark:text-gray-400">{p.office.name}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {p.startDate || p.endDate ? (
                            <>
                              {p.startDate && new Date(p.startDate).toLocaleDateString()}
                              {p.startDate && p.endDate && " - "}
                              {p.endDate && new Date(p.endDate).toLocaleDateString()}
                            </>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-1">
                              {statusOptions.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(p.id, s)}
                                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                                    p.status === s
                                      ? "bg-gray-900 dark:bg-gray-700 text-white border border-gray-900 dark:border-gray-700"
                                      : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-600"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition self-start"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
