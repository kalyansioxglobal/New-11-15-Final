import React, { useState } from "react";
import type { UserRole } from "@/lib/permissions";
import { UserRoleSelector } from "./UserRoleSelector";
import { UserVenturesEditor } from "./UserVenturesEditor";

interface VentureOption {
  id: number;
  name: string;
  slug?: string | null;
  type?: string | null;
  logisticsRole?: string | null;
}

interface OfficeOption {
  id: number;
  name: string;
  city?: string | null;
  ventureId: number;
}

interface Props {
  mode: "create" | "edit";
  initialData?: {
    id?: number;
    name?: string | null;
    email?: string;
    phone?: string | null;
    role: UserRole;
    isActive?: boolean;
    ventureIds: number[];
    officeIds: number[];
  };
  ventures: VentureOption[];
  offices: OfficeOption[];
  onSaved: () => void;
  onCancel?: () => void;
}

export const UserForm: React.FC<Props> = ({
  mode,
  initialData,
  ventures,
  offices,
  onSaved,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [role, setRole] = useState<UserRole>(initialData?.role ?? "EMPLOYEE");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [ventureIds, setVentureIds] = useState<number[]>(initialData?.ventureIds ?? []);
  const [officeIds, setOfficeIds] = useState<number[]>(initialData?.officeIds ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        const createRes = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone, role, ventureIds, officeIds }),
        });
        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || "Failed to create user");
        }
      } else if (mode === "edit" && initialData?.id) {
        const updateRes = await fetch("/api/admin/users/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: initialData.id, name, email, phone, role, isActive }),
        });
        if (!updateRes.ok) {
          const data = await updateRes.json();
          throw new Error(data.error || "Failed to update user");
        }

        await fetch("/api/admin/users/setVentures", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: initialData.id, ventureIds }),
        });

        await fetch("/api/admin/users/setOffices", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: initialData.id, officeIds }),
        });
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name ?? ""}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Full name"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <input
            type="tel"
            value={phone ?? ""}
            onChange={(e) => setPhone(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <UserRoleSelector value={role} onChange={setRole} />
      </div>

      {mode === "edit" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            Active User
          </label>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Venture & Office Assignments
        </h3>
        <UserVenturesEditor
          ventures={ventures}
          offices={offices}
          selectedVentureIds={ventureIds}
          selectedOfficeIds={officeIds}
          onChangeVentures={setVentureIds}
          onChangeOffices={setOfficeIds}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
