import { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import { canManageUsers } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';

// Keep department as a simple string union for display/filtering purposes.
type Department = string;

type UserRow = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  phoneUs: string | null;
  phoneIn: string | null;
  extension: string | null;
  alias: string | null;
  role: UserRole;
  legacyDepartment: Department | null;
  jobDepartmentId: number | null;
  jobDepartmentName: string | null;
  jobRoleId: number | null;
  jobRoleName: string | null;
  isActive: boolean;
  isTestUser: boolean;
  ventureIds: number[];
  officeIds: number[];
  reportsToId: number | null;
  reportsToName: string | null;
  reportsToEmail: string | null;
};

type ManagerOption = {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
};

type Venture = { id: number; name: string; type: string };
type Office = { id: number; name: string; city: string | null; ventureId: number };

type JobRoleOption = {
  id: number;
  name: string;
  isManager: boolean;
};

type JobDepartmentOption = {
  id: number;
  name: string;
  ventureType: string | null;
  jobRoles: JobRoleOption[];
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res } = ctx;
  const user = await getEffectiveUser(req, res);

  if (!user || !canManageUsers(user.role)) {
    return {
      redirect: {
        destination: '/overview',
        permanent: false,
      },
    };
  }

  return { props: {} };
};

const ALL_ROLES: UserRole[] = [
  'CEO',
  'ADMIN',
  'COO',
  'VENTURE_HEAD',
  'OFFICE_MANAGER',
  'TEAM_LEAD',
  'CSR',
  'DISPATCHER',
  'CARRIER_TEAM',
  'ACCOUNTING',
  'EMPLOYEE',
  'CONTRACTOR',
  'AUDITOR',
  'FINANCE',
  'HR_ADMIN',
  'TEST_USER',
];

function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [jobDepartments, setJobDepartments] = useState<JobDepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerSearch, setManagerSearch] = useState('');

  const [, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'EMPLOYEE' as UserRole,
    ventureIds: [] as number[],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [uRes, vRes, oRes, jRes] = await Promise.all([
          fetch('/api/admin/users?limit=500'),
          fetch('/api/ventures'),
          fetch('/api/offices'),
          fetch('/api/admin/job-roles'),
        ]);

        if (!uRes.ok) throw new Error('Failed to load users');
        if (!vRes.ok) throw new Error('Failed to load ventures');
        if (!oRes.ok) throw new Error('Failed to load offices');
        if (!jRes.ok) throw new Error('Failed to load job roles');

        const [uJson, vJson, oJson, jJson] = await Promise.all([
          uRes.json(),
          vRes.json(),
          oRes.json(),
          jRes.json(),
        ]);

        if (cancelled) return;
        setUsers(uJson.users || uJson);
        setVentures(vJson);
        setOffices(oJson);
        setJobDepartments(jJson);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const officesForSelectedVentures = useMemo(() => {
    if (!editState) return [];
    if (!editState.ventureIds.length) return [];
    return offices.filter((o) => editState.ventureIds.includes(o.ventureId));
  }, [editState, offices]);

  const jobRolesForSelectedDepartment = useMemo(() => {
    if (!editState || !editState.jobDepartmentId) return [];
    const dept = jobDepartments.find((d) => d.id === editState.jobDepartmentId);
    return dept?.jobRoles ?? [];
  }, [editState, jobDepartments]);

  const managerOptions = useMemo(() => {
    if (!editState) return [];
    const searchLower = managerSearch.toLowerCase();
    return users
      .filter((u) => {
        if (u.id === editState.id) return false;
        if (!u.isActive) return false;
        const managerRoles: UserRole[] = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'TEAM_LEAD', 'HR_ADMIN'];
        if (!managerRoles.includes(u.role)) return false;
        if (!managerSearch) return true;
        return (
          (u.name?.toLowerCase().includes(searchLower)) ||
          u.email.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, 20);
  }, [users, editState, managerSearch]);

  function openEdit(user: UserRow) {
    setEditingId(user.id);
    setEditState({ ...user });
    setManagerSearch('');
    setError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setEditState(null);
    setSaving(false);
  }

  function toggleArrayId(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          phone: createForm.phone || null,
          role: createForm.role,
          ventureIds: createForm.ventureIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Failed to create user');
      }

      const data = await res.json();
      const newUser = data.user;
      
      setUsers((prev) => [...prev, {
        id: newUser.id,
        name: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        phoneUs: null,
        phoneIn: null,
        extension: null,
        alias: null,
        role: newUser.role,
        legacyDepartment: null,
        jobDepartmentId: null,
        jobDepartmentName: null,
        jobRoleId: null,
        jobRoleName: null,
        isActive: newUser.isActive,
        isTestUser: false,
        ventureIds: createForm.ventureIds,
        officeIds: [],
        reportsToId: null,
        reportsToName: null,
        reportsToEmail: null,
      }]);
      
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', role: 'EMPLOYEE', ventureIds: [] });
      setSaving(false);
    } catch (e: any) {
      setError(e.message || 'Failed to create user');
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!editState) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name,
          email: editState.email,
          phone: editState.phone,
          phoneUs: editState.phoneUs,
          phoneIn: editState.phoneIn,
          extension: editState.extension,
          alias: editState.alias,
          role: editState.role,
          legacyDepartment: editState.legacyDepartment,
          jobDepartmentId: editState.jobDepartmentId,
          jobRoleId: editState.jobRoleId,
          isActive: editState.isActive,
          isTestUser: editState.isTestUser,
          ventureIds: editState.ventureIds,
          officeIds: editState.officeIds,
          reportsToId: editState.reportsToId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      const selectedDept = jobDepartments.find((d) => d.id === editState.jobDepartmentId);
      const selectedRole = selectedDept?.jobRoles.find((r) => r.id === editState.jobRoleId);
      
      setUsers((prev) =>
        prev.map((u) => (u.id === editState.id ? { 
          ...editState,
          jobDepartmentName: selectedDept?.name ?? null,
          jobRoleName: selectedRole?.name ?? null,
        } : u))
      );
      closeEdit();
    } catch (e: any) {
      setError(e.message || 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h1 className="text-lg sm:text-xl font-semibold">Admin - Users</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            + Add New User
          </button>
        </div>

        {loading && <div className="text-sm text-gray-400">Loading users...</div>}
        {error && !loading && (
          <div className="mb-2 text-sm text-red-500">{error}</div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-sm text-gray-400">No users found.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm border border-gray-200 bg-white rounded">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 sm:px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-medium hidden sm:table-cell">Alias</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-medium hidden md:table-cell">Reports To</th>
                  <th className="px-2 sm:px-3 py-2 text-center font-medium">Role</th>
                  <th className="px-2 sm:px-3 py-2 text-center font-medium hidden sm:table-cell">Active</th>
                  <th className="px-2 sm:px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-2 sm:px-3 py-2">
                      <div className="truncate max-w-[100px] sm:max-w-none">{u.name || '-'}</div>
                      {u.jobRoleName && (
                        <div className="text-xs text-gray-400 truncate" title={u.jobDepartmentName ?? ''}>
                          {u.jobRoleName}
                        </div>
                      )}
                      {!u.isActive && <span className="sm:hidden text-xs text-gray-400 block">Inactive</span>}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-gray-600 hidden sm:table-cell">{u.alias || '-'}</td>
                    <td className="px-2 sm:px-3 py-2 text-gray-600 text-xs">
                      <span className="truncate block max-w-[120px] sm:max-w-none">{u.email}</span>
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-xs hidden md:table-cell">
                      {u.reportsToName ? (
                        <div>
                          <div className="font-medium">{u.reportsToName}</div>
                          <div className="text-gray-400 text-[10px]">{u.reportsToEmail}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-center text-xs">{u.role}</td>
                    <td className="px-2 sm:px-3 py-2 text-center hidden sm:table-cell">
                      {u.isActive ? (
                        <span className="text-green-600 text-xs">Active</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Inactive</span>
                      )}
                      {u.isTestUser && (
                        <div className="text-amber-600 text-xs">Test</div>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editState && (
        <>
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeEdit} />
        <div className="fixed inset-x-0 bottom-0 top-14 lg:static lg:inset-auto z-50 lg:z-auto w-full lg:w-[360px] border-t lg:border border-gray-200 rounded-t-2xl lg:rounded-lg bg-white p-4 text-sm shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">Edit User</h2>
            <button
              onClick={closeEdit}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs mb-1 text-gray-500">Name</label>
              <input
                type="text"
                value={editState.name || ''}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, name: e.target.value })
                }
                className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">Email</label>
              <input
                type="email"
                value={editState.email}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, email: e.target.value })
                }
                className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">Alias / Nickname</label>
              <input
                type="text"
                value={editState.alias || ''}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, alias: e.target.value || null })
                }
                placeholder="Unique identifier"
                className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
              />
            </div>

            <div className="border-t border-gray-200 pt-3">
              <label className="block text-xs mb-2 text-gray-600 font-medium">
                Contact Information
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 text-gray-500">US Phone</label>
                    <input
                      type="tel"
                      value={editState.phoneUs || ''}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, phoneUs: e.target.value || null })
                      }
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-500">Extension</label>
                    <input
                      type="text"
                      value={editState.extension || ''}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, extension: e.target.value || null })
                      }
                      placeholder="1234"
                      className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-500">International Phone</label>
                  <input
                    type="tel"
                    value={editState.phoneIn || ''}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, phoneIn: e.target.value || null })
                    }
                    placeholder="+91 98765 43210"
                    className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-500">Other Phone</label>
                  <input
                    type="tel"
                    value={editState.phone || ''}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, phone: e.target.value || null })
                    }
                    placeholder="Alternative number"
                    className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">System Role (permissions)</label>
              <select
                value={editState.role}
                onChange={(e) =>
                  setEditState(
                    (s) =>
                      s && {
                        ...s,
                        role: e.target.value as UserRole,
                      }
                  )
                }
                className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <label className="block text-xs mb-2 text-gray-600 font-medium">
                Job Title (real-world role)
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-500">Department</label>
                  <select
                    value={editState.jobDepartmentId ?? ''}
                    onChange={(e) => {
                      const newDeptId = e.target.value ? Number(e.target.value) : null;
                      setEditState(
                        (s) =>
                          s && {
                            ...s,
                            jobDepartmentId: newDeptId,
                            jobRoleId: null,
                          }
                      );
                    }}
                    className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                  >
                    <option value="">- Select department -</option>
                    {jobDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.ventureType ? `(${d.ventureType})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs mb-1 text-gray-500">Job Role</label>
                  <select
                    value={editState.jobRoleId ?? ''}
                    onChange={(e) => {
                      const newRoleId = e.target.value ? Number(e.target.value) : null;
                      setEditState(
                        (s) =>
                          s && {
                            ...s,
                            jobRoleId: newRoleId,
                          }
                      );
                    }}
                    disabled={!editState.jobDepartmentId}
                    className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm disabled:opacity-50"
                  >
                    <option value="">- Select job role -</option>
                    {jobRolesForSelectedDepartment.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isManager ? '(Manager)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <label className="block text-xs mb-2 text-gray-600 font-medium">
                Reporting Manager
              </label>
              <div className="space-y-2">
                {editState.reportsToId && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                    <div>
                      <div className="text-sm font-medium text-blue-900">
                        {editState.reportsToName || 'Unknown'}
                      </div>
                      <div className="text-xs text-blue-600">
                        {editState.reportsToEmail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditState(s => s && { ...s, reportsToId: null, reportsToName: null, reportsToEmail: null })}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div>
                  <input
                    type="text"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    placeholder="Search managers by name or email..."
                    className="w-full px-2 py-1 rounded bg-gray-50 border border-gray-300 text-sm"
                  />
                </div>
                {managerSearch && managerOptions.length > 0 && (
                  <div className="border border-gray-200 rounded max-h-32 overflow-y-auto bg-white">
                    {managerOptions.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setEditState(s => s && { 
                            ...s, 
                            reportsToId: m.id, 
                            reportsToName: m.name,
                            reportsToEmail: m.email,
                          });
                          setManagerSearch('');
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium">{m.name || m.email}</div>
                        <div className="text-gray-500">{m.role} - {m.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {managerSearch && managerOptions.length === 0 && (
                  <div className="text-xs text-gray-400 py-1">No managers found</div>
                )}
                <p className="text-xs text-gray-400">
                  Cross-venture: Managers from any venture can be selected.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <label className="block text-xs mb-1 text-gray-500 text-gray-400">
                Legacy Department (read-only)
              </label>
              <div className="text-sm text-gray-500 px-2 py-1">
                {editState.legacyDepartment || '-'}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={editState.isActive}
                  onChange={(e) =>
                    setEditState(
                      (s) => s && { ...s, isActive: e.target.checked }
                    )
                  }
                />
                Active
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={editState.isTestUser}
                  onChange={(e) =>
                    setEditState(
                      (s) => s && { ...s, isTestUser: e.target.checked }
                    )
                  }
                />
                Test user
              </label>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">
                Ventures (scope)
              </label>
              <div className="border border-gray-200 rounded p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50">
                {ventures.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 text-xs text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={editState.ventureIds.includes(v.id)}
                      onChange={() =>
                        setEditState(
                          (s) =>
                            s && {
                              ...s,
                              ventureIds: toggleArrayId(s.ventureIds, v.id),
                            }
                        )
                      }
                    />
                    {v.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500">
                Offices (scope)
              </label>
              <div className="border border-gray-200 rounded p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50">
                {officesForSelectedVentures.length === 0 && (
                  <div className="text-xs text-gray-400">
                    Select ventures first.
                  </div>
                )}
                {officesForSelectedVentures.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 text-xs text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={editState.officeIds.includes(o.id)}
                      onChange={() =>
                        setEditState(
                          (s) =>
                            s && {
                              ...s,
                              officeIds: toggleArrayId(s.officeIds, o.id),
                            }
                        )
                      }
                    />
                    {o.name}
                    {o.city ? ` - ${o.city}` : ''}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 text-xs text-red-500">{error}</div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={closeEdit}
              disabled={saving}
              className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-xs rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add New User</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="john@sioxglobal.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="+1 555-123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Ventures
                </label>
                <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50">
                  {ventures.map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.ventureIds.includes(v.id)}
                        onChange={() =>
                          setCreateForm((f) => ({
                            ...f,
                            ventureIds: toggleArrayId(f.ventureIds, v.id),
                          }))
                        }
                      />
                      {v.name}
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

UsersAdminPage.title = 'Admin - Users';

export default UsersAdminPage;
