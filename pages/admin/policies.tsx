import React, { useState } from "react";
import { GetServerSideProps } from "next";
import type { UserRole } from "@/lib/permissions";
import prisma from "../../lib/prisma";

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

      await router.replace(router.asPath);
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
    } catch (err: any) {
      alert(err.message || "Error deleting policy");
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
    } catch (err: any) {
      alert(err.message || "Error updating policy");
    }
  };

  const getStatusColor = (s: PolicyStatus) => {
    switch (s) {
      case "ACTIVE": return { bg: "#dcfce7", color: "#166534" };
      case "PENDING": return { bg: "#fef3c7", color: "#92400e" };
      case "EXPIRED": return { bg: "#fee2e2", color: "#b91c1c" };
      case "CANCELLED": return { bg: "#f3f4f6", color: "#6b7280" };
      default: return { bg: "#e5e7eb", color: "#111827" };
    }
  };

  return (
    <>
      <section
        style={{
          marginBottom: "2rem",
          padding: "1rem 1.5rem",
          border: "1px solid #eee",
          borderRadius: "8px",
          background: "#fff",
          maxWidth: "900px",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Create new policy
        </h2>

        {!canEdit && (
          <p style={{ color: "#b45309", background: "#fef3c7", padding: "0.5rem", borderRadius: "4px", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
            You don&apos;t have permission to create or edit policies.
          </p>
        )}

        {error && <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>}

        <fieldset disabled={!canEdit} style={!canEdit ? { opacity: 0.6, pointerEvents: "none" } : {}}>
          <form
            onSubmit={handleCreate}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem 1rem",
            }}
          >
          <label style={labelStyle}>
            <span>Venture *</span>
            <select
              value={ventureId}
              onChange={(e) => setVentureId(e.target.value === "" ? "" : Number(e.target.value))}
              required
              style={inputStyle}
            >
              <option value="">Select venture</option>
              {ventures.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Office</span>
            <select
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value === "" ? "" : Number(e.target.value))}
              style={inputStyle}
            >
              <option value="">- None -</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="General Liability 2025"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Type *</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PolicyType)}
              style={inputStyle}
            >
              {policyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>Provider</span>
            <input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Geico, landlord name..."
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Policy #</span>
            <input
              value={policyNo}
              onChange={(e) => setPolicyNo(e.target.value)}
              placeholder="POL-12345"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PolicyStatus)}
              style={inputStyle}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            <span>File URL</span>
            <input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </label>

          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            <span>Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          <div style={{ gridColumn: "1 / -1" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "4px",
                border: "none",
                background: loading ? "#999" : "#111827",
                color: "#fff",
                cursor: loading ? "default" : "pointer",
                fontWeight: 500,
              }}
            >
              {loading ? "Creating..." : "Create policy"}
            </button>
          </div>
          </form>
        </fieldset>
      </section>

      <section>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>Policies</h2>

        {policies.length === 0 ? (
          <p>No policies yet.</p>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "1100px", background: "#fff" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Venture / Office</th>
                <th style={thStyle}>Dates</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => {
                const statusStyle = getStatusColor(p.status);
                return (
                  <tr key={p.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.policyNo && <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>#{p.policyNo}</div>}
                      {p.provider && <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{p.provider}</div>}
                    </td>
                    <td style={tdStyle}>{p.type}</td>
                    <td style={tdStyle}>
                      <div>{p.venture?.name}</div>
                      {p.office && <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{p.office.name}</div>}
                    </td>
                    <td style={tdStyle}>
                      {p.startDate || p.endDate ? (
                        <>
                          {p.startDate && new Date(p.startDate).toLocaleDateString()}
                          {p.startDate && p.endDate && " - "}
                          {p.endDate && new Date(p.endDate).toLocaleDateString()}
                        </>
                      ) : "-"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                        {statusOptions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(p.id, s)}
                            style={{
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                              border: p.status === s ? "1px solid #111827" : "1px solid #d1d5db",
                              background: p.status === s ? "#111827" : "#f9fafb",
                              color: p.status === s ? "#fff" : "#111827",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{
                          marginTop: "0.35rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          border: "none",
                          background: "#b91c1c",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.25rem",
};

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "0.9rem",
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  padding: "0.5rem 0.75rem",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f1f1",
  padding: "0.45rem 0.75rem",
  fontSize: "0.9rem",
  verticalAlign: "top",
};
