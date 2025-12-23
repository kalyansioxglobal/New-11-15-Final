import { useState, useMemo } from 'react';
import { GetServerSideProps } from 'next';
import useSWR from 'swr';
import Link from 'next/link';
import { getEffectiveUser } from '@/lib/effectiveUser';
import { canManageUsers } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type OrgUser = {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
  jobRoleName: string | null;
  reportsToId: number | null;
  isActive: boolean;
  ventureIds: number[];
};

type TreeNode = OrgUser & {
  children: TreeNode[];
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

function buildTree(users: OrgUser[]): TreeNode[] {
  const userMap = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  users.forEach((u) => {
    userMap.set(u.id, { ...u, children: [] });
  });

  users.forEach((u) => {
    const node = userMap.get(u.id)!;
    if (u.reportsToId && userMap.has(u.reportsToId)) {
      userMap.get(u.reportsToId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function OrgNode({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  const roleColors: Record<string, string> = {
    CEO: 'bg-purple-100 text-purple-800 border-purple-300',
    ADMIN: 'bg-red-100 text-red-800 border-red-300',
    COO: 'bg-blue-100 text-blue-800 border-blue-300',
    VENTURE_HEAD: 'bg-green-100 text-green-800 border-green-300',
    OFFICE_MANAGER: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    TEAM_LEAD: 'bg-orange-100 text-orange-800 border-orange-300',
    HR_ADMIN: 'bg-pink-100 text-pink-800 border-pink-300',
  };

  const roleColor = roleColors[node.role] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <div className="relative">
      <div
        className={`flex items-start gap-2 p-2 rounded-lg border ${node.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'} hover:shadow-sm transition`}
        style={{ marginLeft: level * 24 }}
      >
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {node.name || node.email}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${roleColor}`}>
              {node.role.replace('_', ' ')}
            </span>
          </div>
          {node.jobRoleName && (
            <div className="text-xs text-gray-500 truncate">{node.jobRoleName}</div>
          )}
          <div className="text-[10px] text-gray-400 truncate">{node.email}</div>
        </div>

        {hasChildren && (
          <div className="text-xs text-gray-400">
            {node.children.length} report{node.children.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="mt-1 space-y-1 border-l-2 border-gray-200 ml-4">
          {node.children
            .sort((a, b) => {
              const roleOrder = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'TEAM_LEAD', 'HR_ADMIN', 'EMPLOYEE', 'AUDITOR', 'VIEWER'];
              const aIdx = roleOrder.indexOf(a.role);
              const bIdx = roleOrder.indexOf(b.role);
              const aOrder = aIdx === -1 ? roleOrder.length : aIdx;
              const bOrder = bIdx === -1 ? roleOrder.length : bIdx;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return (a.name || a.email).localeCompare(b.name || b.email);
            })
            .map((child) => (
              <OrgNode key={child.id} node={child} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data, isLoading } = useSWR<{ users: OrgUser[] }>('/api/admin/users?limit=500', fetcher);
  const [ventureFilter, setVentureFilter] = useState<number | ''>('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: ventures } = useSWR<{ id: number; name: string }[]>('/api/ventures', fetcher);

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    return data.users.filter((u) => {
      if (!showInactive && !u.isActive) return false;
      if (ventureFilter && !u.ventureIds.includes(Number(ventureFilter))) return false;
      return true;
    });
  }, [data?.users, ventureFilter, showInactive]);

  const tree = useMemo(() => buildTree(filteredUsers), [filteredUsers]);

  const stats = useMemo(() => {
    if (!filteredUsers.length) return null;
    const withManager = filteredUsers.filter((u) => u.reportsToId).length;
    const withoutManager = filteredUsers.filter((u) => !u.reportsToId).length;
    return { total: filteredUsers.length, withManager, withoutManager };
  }, [filteredUsers]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Organization Chart</h1>
          <p className="text-sm text-gray-500">Visual hierarchy of reporting relationships</p>
        </div>
        <Link href="/admin/users" className="text-sm text-blue-600 hover:underline">
          Edit Users
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={ventureFilter}
          onChange={(e) => setVentureFilter(e.target.value ? Number(e.target.value) : '')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Ventures</option>
          {ventures?.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive users
        </label>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">{stats.withManager}</div>
            <div className="text-sm text-gray-500">With Manager</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.withoutManager}</div>
            <div className="text-sm text-gray-500">No Manager Assigned</div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500">Loading organization...</div>
      )}

      {!isLoading && tree.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No users found. Adjust filters or add users.
        </div>
      )}

      {!isLoading && tree.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          {tree
            .sort((a, b) => {
              const roleOrder = ['CEO', 'ADMIN', 'COO', 'VENTURE_HEAD', 'OFFICE_MANAGER', 'TEAM_LEAD', 'HR_ADMIN', 'EMPLOYEE', 'AUDITOR', 'VIEWER'];
              const aIdx = roleOrder.indexOf(a.role);
              const bIdx = roleOrder.indexOf(b.role);
              const aOrder = aIdx === -1 ? roleOrder.length : aIdx;
              const bOrder = bIdx === -1 ? roleOrder.length : bIdx;
              if (aOrder !== bOrder) return aOrder - bOrder;
              return (a.name || a.email).localeCompare(b.name || b.email);
            })
            .map((node) => (
              <OrgNode key={node.id} node={node} />
            ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-400">
        <p>Users without a reporting manager appear at the top level.</p>
        <p>Click the arrow to expand/collapse direct reports.</p>
      </div>
    </div>
  );
}
