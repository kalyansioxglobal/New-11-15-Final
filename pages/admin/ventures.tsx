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
      await router.replace(router.asPath);
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

  const hasVentures = Array.isArray(ventures) && ventures.length > 0;

  return (
    <div>
      <section
        style={{
          marginBottom: "2rem",
          padding: "1rem 1.5rem",
          border: "1px solid #eee",
          borderRadius: "8px",
          background: "#fff",
          maxWidth: "640px",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Create new venture
        </h2>

        {error && (
          <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>
        )}

        <form
          onSubmit={handleCreate}
          style={{ display: "grid", gap: "0.5rem" }}
        >
          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Siox Logistics"
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Slug (unique)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="siox-logistics"
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "0.25rem" }}>
            <span>Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              {ventureTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 1rem",
              borderRadius: "4px",
              border: "none",
              background: loading ? "#999" : "#111827",
              color: "#fff",
              cursor: loading ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {loading ? "Creating..." : "Create venture"}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
          Existing ventures
        </h2>

        {!hasVentures ? (
          <p>No ventures yet.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              maxWidth: "900px",
              background: "#fff",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Slug</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Offices</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ventures.map((v) => {
                const isActive = Boolean(v.isActive);

                return (
                  <tr key={v.id}>
                    <td style={tdStyle}>{v.name}</td>
                    <td style={tdStyle}>{v.slug}</td>
                    <td style={tdStyle}>{v.type}</td>
                    <td style={tdStyle}>{v.officeCount}</td>
                    <td style={tdStyle}>{isActive ? "Yes" : "No"}</td>
                    <td style={tdStyle}>
                      {isActive ? (
                        <button
                          onClick={() => handleSoftDelete(v.id)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            border: "none",
                            background: "#b91c1c",
                            color: "#fff",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

AdminVentures.title = "Admin – Ventures";

export default AdminVentures;

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
};
