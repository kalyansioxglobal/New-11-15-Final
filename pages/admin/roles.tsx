import { useState, useCallback } from "react";
import type { UserRole } from "@/lib/permissions";
import { GetServerSideProps } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { isSuperAdmin, DEFAULT_PERMISSION_MATRIX } from "@/lib/permissions";
import toast from "react-hot-toast";
import { getPermissionsData } from "@/lib/admin/getPermissionsData";

type PermissionAction = "none" | "view" | "edit" | "manage";

type RolePermissions = {
  tasks?: PermissionAction;
  ventures?: PermissionAction;
  users?: PermissionAction;
  impersonate?: boolean;
  logistics?: PermissionAction;
  hotels?: PermissionAction;
  approvals?: PermissionAction;
  accounting?: PermissionAction;
};

type PermissionMatrix = {
  [role in UserRole]?: RolePermissions;
};

type VentureOverride = {
  ventureId: number;
  ventureName: string;
  ventureType: string;
  roleOverrides: PermissionMatrix;
  isActive: boolean;
  createdBy: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

type Venture = {
  id: number;
  name: string;
  type: string;
};

const RESOURCES = [
  { key: "tasks", label: "Tasks", description: "Task management" },
  { key: "ventures", label: "Ventures", description: "Venture access" },
  { key: "users", label: "Users", description: "User management" },
  { key: "logistics", label: "Logistics", description: "Freight operations" },
  { key: "hotels", label: "Hotels", description: "Hotel operations" },
  { key: "approvals", label: "Approvals", description: "Approval workflows" },
  { key: "accounting", label: "Accounting", description: "Financial data" },
] as const;

const ROLES: UserRole[] = [
  "CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD",
  "EMPLOYEE", "CONTRACTOR", "AUDITOR", "FINANCE", "HR_ADMIN",
  "CSR", "DISPATCHER", "CARRIER_TEAM", "ACCOUNTING",
];

const ACTION_COLORS: Record<PermissionAction, string> = {
  none: "bg-gray-100 text-gray-500",
  view: "bg-blue-100 text-blue-700",
  edit: "bg-yellow-100 text-yellow-700",
  manage: "bg-green-100 text-green-700",
};

const ACTION_OPTIONS: PermissionAction[] = ["none", "view", "edit", "manage"];

type Props = {
  initialMatrix: PermissionMatrix;
  initialVentureOverrides: VentureOverride[];
  ventures: Venture[];
  defaultMatrix: PermissionMatrix;
};

export default function RoleMatrixPage({
  initialMatrix,
  initialVentureOverrides,
  ventures,
  defaultMatrix,
}: Props) {
  const [matrix, setMatrix] = useState<PermissionMatrix>(initialMatrix);
  const [ventureOverrides, setVentureOverrides] = useState<VentureOverride[]>(initialVentureOverrides);
  const [serverPersistedOverrideIds, setServerPersistedOverrideIds] = useState<Set<number>>(
    () => new Set(initialVentureOverrides.map((v) => v.ventureId))
  );
  const [deletedVentureOverrides, setDeletedVentureOverrides] = useState<number[]>([]);
  const [selectedVenture, setSelectedVenture] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"global" | "venture">("global");

  const currentMatrix = selectedVenture
    ? ventureOverrides.find((v) => v.ventureId === selectedVenture)?.roleOverrides || {}
    : matrix;

  const getEffectiveValue = useCallback(
    (role: UserRole, resource: string): PermissionAction => {
      if (selectedVenture) {
        const override = ventureOverrides.find((v) => v.ventureId === selectedVenture);
        const overrideValue = override?.roleOverrides?.[role]?.[resource as keyof RolePermissions];
        if (overrideValue !== undefined) return overrideValue as PermissionAction;
      }
      return (matrix[role]?.[resource as keyof RolePermissions] as PermissionAction) || "none";
    },
    [matrix, ventureOverrides, selectedVenture]
  );

  const updatePermission = (role: UserRole, resource: string, value: PermissionAction) => {
    if (selectedVenture) {
      setVentureOverrides((prev) => {
        const existing = prev.find((v) => v.ventureId === selectedVenture);
        if (existing) {
          return prev.map((v) =>
            v.ventureId === selectedVenture
              ? {
                  ...v,
                  roleOverrides: {
                    ...v.roleOverrides,
                    [role]: { ...v.roleOverrides[role], [resource]: value },
                  },
                }
              : v
          );
        }
        const venture = ventures.find((v) => v.id === selectedVenture);
        return [
          ...prev,
          {
            ventureId: selectedVenture,
            ventureName: venture?.name || "",
            ventureType: venture?.type || "",
            roleOverrides: { [role]: { [resource]: value } },
            isActive: true,
            createdBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });
    } else {
      setMatrix((prev) => ({
        ...prev,
        [role]: { ...prev[role], [resource]: value },
      }));
    }
    setHasChanges(true);
  };

  const updateImpersonate = (role: UserRole, value: boolean) => {
    if (selectedVenture) {
      setVentureOverrides((prev) => {
        const existing = prev.find((v) => v.ventureId === selectedVenture);
        if (existing) {
          return prev.map((v) =>
            v.ventureId === selectedVenture
              ? {
                  ...v,
                  roleOverrides: {
                    ...v.roleOverrides,
                    [role]: { ...v.roleOverrides[role], impersonate: value },
                  },
                }
              : v
          );
        }
        const venture = ventures.find((v) => v.id === selectedVenture);
        return [
          ...prev,
          {
            ventureId: selectedVenture,
            ventureName: venture?.name || "",
            ventureType: venture?.type || "",
            roleOverrides: { [role]: { impersonate: value } },
            isActive: true,
            createdBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });
    } else {
      setMatrix((prev) => ({
        ...prev,
        [role]: { ...prev[role], impersonate: value },
      }));
    }
    setHasChanges(true);
  };

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/permissions/get");
      if (response.ok) {
        const data = await response.json();
        setMatrix(data.matrix || {});
        setVentureOverrides(data.ventureOverrides || []);
        setServerPersistedOverrideIds(new Set((data.ventureOverrides || []).map((v: VentureOverride) => v.ventureId)));
      }
    } catch (err) {
      console.error("Failed to refresh permissions:", err);
    }
  }, []);

  const saveChanges = async () => {
    setSaving(true);
    try {
      if (deletedVentureOverrides.length > 0) {
        for (const ventureId of deletedVentureOverrides) {
          const response = await fetch(`/api/admin/permissions/ventures/${ventureId}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const data = await response.json();
            if (data.error !== "No override found for this venture") {
              throw new Error(`Failed to delete override for venture ${ventureId}`);
            }
          }
        }
        setDeletedVentureOverrides([]);
      }
      
      if (selectedVenture) {
        const override = ventureOverrides.find((v) => v.ventureId === selectedVenture);
        if (override) {
          const response = await fetch(`/api/admin/permissions/ventures/${selectedVenture}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleOverrides: override.roleOverrides, isActive: true }),
          });
          if (!response.ok) throw new Error("Failed to save venture override");
        }
      } else {
        const response = await fetch("/api/admin/permissions/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matrix }),
        });
        if (!response.ok) throw new Error("Failed to save permissions");
      }
      toast.success("Permissions saved successfully");
      setHasChanges(false);
      await fetchPermissions();
    } catch (err) {
      toast.error("Failed to save permissions");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (selectedVenture) {
      if (serverPersistedOverrideIds.has(selectedVenture)) {
        setDeletedVentureOverrides((prev) => [...prev.filter((id) => id !== selectedVenture), selectedVenture]);
      }
      setVentureOverrides((prev) => prev.filter((v) => v.ventureId !== selectedVenture));
    } else {
      setMatrix(defaultMatrix);
    }
    setHasChanges(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Role & Permission Matrix</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage role-based access control across the system.
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              onClick={resetToDefault}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset to Default
            </button>
          )}
          <button
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            className={`px-4 py-2 text-sm rounded-lg font-medium ${
              hasChanges
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab("global"); setSelectedVenture(null); }}
          className={`pb-2 px-1 text-sm font-medium border-b-2 ${
            activeTab === "global"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Global Permissions
        </button>
        <button
          onClick={() => setActiveTab("venture")}
          className={`pb-2 px-1 text-sm font-medium border-b-2 ${
            activeTab === "venture"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Venture Overrides
        </button>
      </div>

      {activeTab === "venture" && (
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Select Venture:</label>
          <select
            value={selectedVenture || ""}
            onChange={(e) => setSelectedVenture(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[200px]"
          >
            <option value="">Choose a venture...</option>
            {ventures.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>
          {selectedVenture && ventureOverrides.find((v) => v.ventureId === selectedVenture) && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
              Has Custom Override
            </span>
          )}
        </div>
      )}

      {(activeTab === "global" || selectedVenture) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-gray-50 z-10">Resource</th>
                  {ROLES.map((role) => (
                    <th key={role} className="px-2 py-2 text-center font-medium whitespace-nowrap">
                      {role.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {RESOURCES.map(({ key, label, description }) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-gray-500 text-[10px]">{description}</div>
                    </td>
                    {ROLES.map((role) => {
                      const value = getEffectiveValue(role, key);
                      return (
                        <td key={role} className="px-1 py-2 text-center">
                          <select
                            value={value}
                            onChange={(e) => updatePermission(role, key, e.target.value as PermissionAction)}
                            className={`px-2 py-1 rounded text-[10px] font-medium cursor-pointer border-0 ${ACTION_COLORS[value]}`}
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="font-medium text-gray-900">Impersonate</div>
                    <div className="text-gray-500 text-[10px]">Can act as other users</div>
                  </td>
                  {ROLES.map((role) => {
                    const value = selectedVenture
                      ? ventureOverrides.find((v) => v.ventureId === selectedVenture)?.roleOverrides?.[role]?.impersonate
                      : matrix[role]?.impersonate;
                    const isChecked = value ?? false;
                    return (
                      <td key={role} className="px-1 py-2 text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => updateImpersonate(role, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "venture" && !selectedVenture && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Select a venture to view or edit its permission overrides.</p>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <h3 className="font-semibold text-yellow-800 mb-2">Permission Levels</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${ACTION_COLORS.none}`}>NONE</span>
            <span className="text-gray-600">No access</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${ACTION_COLORS.view}`}>VIEW</span>
            <span className="text-gray-600">Read-only access</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${ACTION_COLORS.edit}`}>EDIT</span>
            <span className="text-gray-600">Can modify</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${ACTION_COLORS.manage}`}>MANAGE</span>
            <span className="text-gray-600">Full control</span>
          </div>
        </div>
        <p className="mt-3 text-gray-600 text-xs">
          <strong>Venture Overrides:</strong> Use the Venture Overrides tab to set permissions specific to a venture.
          These override the global permissions for users assigned to that venture.
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user || !isSuperAdmin(user.role)) {
    return {
      redirect: { destination: "/overview", permanent: false },
    };
  }

  try {
    const data = await getPermissionsData();

    return {
      props: {
        initialMatrix: data.globalMatrix as PermissionMatrix,
        initialVentureOverrides: data.ventureOverrides as VentureOverride[],
        ventures: data.ventures,
        defaultMatrix: data.defaultMatrix as PermissionMatrix,
      },
    };
  } catch (err) {
    console.error("Error fetching permissions:", err);
    return {
      props: {
        initialMatrix: {},
        initialVentureOverrides: [],
        ventures: [],
        defaultMatrix: {},
      },
    };
  }
};

RoleMatrixPage.title = "Admin - Role Matrix";
