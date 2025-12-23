import { useState } from "react";
import type { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { isSuperAdmin } from "@/lib/permissions";
import prisma from "@/lib/prisma";

type Venture = { id: number; name: string };

type Office = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  timezone: string | null;
  ventureId: number;
  venture: { name: string };
  _count: { users: number };
};

type Props = {
  offices: Office[];
  ventures: Venture[];
};

export default function AdminOfficesPage({ offices: initialOffices, ventures }: Props) {
  const [offices, setOffices] = useState<Office[]>(initialOffices);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    ventureId: "",
    city: "",
    country: "",
    timezone: "",
  });

  const resetForm = () => {
    setForm({ name: "", ventureId: "", city: "", country: "", timezone: "" });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (office: Office) => {
    setForm({
      name: office.name,
      ventureId: String(office.ventureId),
      city: office.city || "",
      country: office.country || "",
      timezone: (office as any).timezone || "",
    });
    setEditingId(office.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.ventureId) {
      setError("Name and venture are required");
      return;
    }

    setLoading(true);

    try {
      const url = editingId ? `/api/admin/offices/${editingId}` : "/api/admin/offices";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          ventureId: Number(form.ventureId),
          city: form.city.trim() || null,
          country: form.country.trim() || null,
          timezone: form.timezone.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save office");
      }

      const savedOffice = await res.json();

      if (editingId) {
        setOffices((prev) =>
          prev.map((o) => (o.id === editingId ? savedOffice : o))
        );
      } else {
        setOffices((prev) => [...prev, savedOffice]);
      }

      resetForm();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this office?")) return;

    try {
      const res = await fetch(`/api/admin/offices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete office");
      setOffices((prev) => prev.filter((o) => o.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offices</h1>
          <p className="text-sm text-gray-500 mt-1">Manage physical locations across ventures</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Office
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Office" : "New Office"}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Chicago Sales Office"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venture <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.ventureId}
                  onChange={(e) => setForm((f) => ({ ...f, ventureId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                >
                  <option value="">Select venture...</option>
                  {ventures.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g., Chicago"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="e.g., India"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={form.timezone}
                  onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                  placeholder="e.g., Asia/Kolkata"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : editingId ? "Save Changes" : "Create Office"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Office
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Venture
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Users
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {offices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No offices found. Create your first office to get started.
                </td>
              </tr>
            ) : (
              offices.map((office) => (
                <tr key={office.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {office.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[office.city, office.country]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {office.venture?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {office._count?.users ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(office)}
                      className="text-blue-600 hover:underline text-sm mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(office.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const user = await getEffectiveUser(ctx.req, ctx.res);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  if (!isSuperAdmin(user.role)) {
    return { redirect: { destination: "/unauthorized", permanent: false } };
  }

  const [offices, ventures] = await Promise.all([
    prisma.office.findMany({
      include: {
        venture: { select: { name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.venture.findMany({
      where: { isTest: false },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    props: {
      offices: JSON.parse(JSON.stringify(offices)),
      ventures: JSON.parse(JSON.stringify(ventures)),
    },
  };
};

AdminOfficesPage.title = "Manage Offices";
