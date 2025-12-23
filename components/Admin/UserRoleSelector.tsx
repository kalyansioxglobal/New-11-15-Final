import React from "react";
import type { UserRole } from "@/lib/permissions";

interface Props {
  value: UserRole;
  onChange: (value: UserRole) => void;
}

const ALL_ROLES: UserRole[] = [
  "CEO",
  "ADMIN",
  "COO",
  "VENTURE_HEAD",
  "OFFICE_MANAGER",
  "TEAM_LEAD",
  "CSR",
  "DISPATCHER",
  "CARRIER_TEAM",
  "ACCOUNTING",
  "EMPLOYEE",
  "CONTRACTOR",
  "AUDITOR",
  "FINANCE",
  "HR_ADMIN",
  "TEST_USER",
];

export const UserRoleSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">Role</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
};
