import { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { getEffectiveUser } from '@/lib/effectiveUser';
import { canManageUsers } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

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
        if (!cancelled) toast.error(e.message || 'Failed to load data');
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
        toast.error(data.detail || data.error || 'Failed to create user');
        setSaving(false);
        return;
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
      
      toast.success('User created successfully');
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', role: 'EMPLOYEE', ventureIds: [] });
      setSaving(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create user');
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!editState) return;
    setSaving(true);
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
        toast.error(data.error || 'Save failed');
        setSaving(false);
        return;
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
      toast.success('User updated successfully');
      closeEdit();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 flex flex-col lg:flex-row gap-4 lg:gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Admin - Users</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn"
          >
            + Add New User
          </button>
        </div>

        {loading && <Skeleton className="w-full h-[85vh]" />}

        {!loading && users.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-500">No users found.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
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
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-2 sm:px-3 py-2">
                      <div className="truncate max-w-[100px] sm:max-w-none text-gray-900 dark:text-white">{u.name || '-'}</div>
                      {u.jobRoleName && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate" title={u.jobDepartmentName ?? ''}>
                          {u.jobRoleName}
                        </div>
                      )}
                      {!u.isActive && <span className="sm:hidden text-xs text-gray-400 dark:text-gray-500 block">Inactive</span>}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-gray-600 dark:text-gray-300 hidden sm:table-cell">{u.alias || '-'}</td>
                    <td className="px-2 sm:px-3 py-2 text-gray-600 dark:text-gray-300 text-xs">
                      <span className="truncate block max-w-[120px] sm:max-w-none">{u.email}</span>
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-xs hidden md:table-cell">
                      {u.reportsToName ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{u.reportsToName}</div>
                          <div className="text-gray-400 dark:text-gray-500 text-[10px]">{u.reportsToEmail}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-center text-xs text-gray-900 dark:text-gray-300">{u.role}</td>
                    <td className="px-2 sm:px-3 py-2 text-center hidden sm:table-cell">
                      {u.isActive ? (
                        <span className="text-green-600 dark:text-green-400 text-xs">Active</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-xs">Inactive</span>
                      )}
                      {u.isTestUser && (
                        <div className="text-amber-600 dark:text-amber-400 text-xs">Test</div>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-2 text-right">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden" onClick={closeEdit} />
        <div className="fixed inset-x-0 bottom-0 top-14 lg:static lg:inset-auto z-50 lg:z-auto w-full lg:w-[360px] border-t lg:border border-gray-200 dark:border-gray-700 rounded-t-2xl lg:rounded-lg bg-white dark:bg-gray-800 p-4 text-sm shadow-lg overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base text-gray-900 dark:text-white">Edit User</h2>
            <button
              onClick={closeEdit}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Name</label>
              <input
                type="text"
                value={editState.name || ''}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, name: e.target.value })
                }
                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Email</label>
              <input
                type="email"
                value={editState.email}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, email: e.target.value })
                }
                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Alias / Nickname</label>
              <input
                type="text"
                value={editState.alias || ''}
                onChange={(e) =>
                  setEditState((s) => s && { ...s, alias: e.target.value || null })
                }
                placeholder="Unique identifier"
                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <label className="block text-xs mb-2 text-gray-600 dark:text-gray-300 font-medium">
                Contact Information
              </label>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">US Phone</label>
                    <input
                      type="tel"
                      value={editState.phoneUs || ''}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, phoneUs: e.target.value || null })
                      }
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Extension</label>
                    <input
                      type="text"
                      value={editState.extension || ''}
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, extension: e.target.value || null })
                      }
                      placeholder="1234"
                      className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">International Phone</label>
                  <input
                    type="tel"
                    value={editState.phoneIn || ''}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, phoneIn: e.target.value || null })
                    }
                    placeholder="+91 98765 43210"
                    className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Other Phone</label>
                  <input
                    type="tel"
                    value={editState.phone || ''}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, phone: e.target.value || null })
                    }
                    placeholder="Alternative number"
                    className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">System Role (permissions)</label>
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
                className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <label className="block text-xs mb-2 text-gray-600 dark:text-gray-300 font-medium">
                Job Title (real-world role)
              </label>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Department</label>
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
                    className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
                  <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">Job Role</label>
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
                    className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <label className="block text-xs mb-2 text-gray-600 dark:text-gray-300 font-medium">
                Reporting Manager
              </label>
              <div className="space-y-2">
                {editState.reportsToId && (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5">
                    <div>
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        {editState.reportsToName || 'Unknown'}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {editState.reportsToEmail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditState(s => s && { ...s, reportsToId: null, reportsToName: null, reportsToEmail: null })}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
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
                    className="w-full px-2 py-1 rounded bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  />
                </div>
                {managerSearch && managerOptions.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded max-h-32 overflow-y-auto bg-white dark:bg-gray-800">
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
                        className="w-full px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{m.name || m.email}</div>
                        <div className="text-gray-500 dark:text-gray-400">{m.role} - {m.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {managerSearch && managerOptions.length === 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 py-1">No managers found</div>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Cross-venture: Managers from any venture can be selected.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">
                Legacy Department (read-only)
              </label>
              <div className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                {editState.legacyDepartment || '-'}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editState.isActive}
                  onChange={(e) =>
                    setEditState(
                      (s) => s && { ...s, isActive: e.target.checked }
                    )
                  }
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                />
                Active
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editState.isTestUser}
                  onChange={(e) =>
                    setEditState(
                      (s) => s && { ...s, isTestUser: e.target.checked }
                    )
                  }
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                />
                Test user
              </label>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">
                Ventures (scope)
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-700/50">
                {ventures.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
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
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                    />
                    {v.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-gray-500 dark:text-gray-400">
                Offices (scope)
              </label>
              <div className="border border-gray-200 dark:border-gray-700 rounded p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-700/50">
                {officesForSelectedVentures.length === 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Select ventures first.
                  </div>
                )}
                {officesForSelectedVentures.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
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
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                    />
                    {o.name}
                    {o.city ? ` - ${o.city}` : ''}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={closeEdit}
              disabled={saving}
              className="px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn flex items-center gap-2 text-xs"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New User</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="john@sioxglobal.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="+1 555-123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Assign to Ventures
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 bg-gray-50 dark:bg-gray-700/50">
                  {ventures.map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
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
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                      />
                      {v.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn flex items-center gap-2 text-sm"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create User
                    </>
                  )}
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
