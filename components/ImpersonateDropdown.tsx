import React, { useState } from 'react';
import useSWR from 'swr';
import { Skeleton } from './ui/Skeleton';

type Role =
  | 'CEO'
  | 'ADMIN'
  | 'COO'
  | 'VENTURE_HEAD'
  | 'OFFICE_MANAGER'
  | 'TEAM_LEAD'
  | 'EMPLOYEE'
  | 'CONTRACTOR'
  | 'AUDITOR'
  | 'FINANCE'
  | 'HR_ADMIN'
  | 'TEST_USER';

type ApiUser = {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  isTestUser: boolean;
};

type ImpersonateState = {
  realUser: ApiUser | null;
  effectiveUser: ApiUser | null;
  targets: ApiUser[];
};

const impersonateFetcher = async (url: string): Promise<ImpersonateState> => {
  const res = await fetch(url);
  if (!res.ok) return { realUser: null, effectiveUser: null, targets: [] };
  return res.json();
};

const ImpersonateDropdown: React.FC = () => {
  const { data: state, isLoading: loading, mutate } = useSWR<ImpersonateState>(
    '/api/impersonate',
    impersonateFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60000 }
  );
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSwitching(true);
    setError(null);
    try {
      const body =
        value === '__clear__'
          ? { targetUserId: null }
          : { targetUserId: Number(value) };

      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to switch user');
      } else {
        await mutate();
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to switch user');
    } finally {
      setSwitching(false);
    }
  };

  const realUser = state?.realUser;
  const effectiveUser = state?.effectiveUser;
  const targets = state?.targets || [];

  const canShow =
    !!realUser &&
    targets.length > 0;

  if (!canShow) return null;

  const isImpersonating =
    realUser && effectiveUser && realUser.id !== effectiveUser.id;

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-col gap-0.5">
        <span className="text-gray-300">
          <strong className="text-gray-100">Real:</strong>{' '}
          {realUser?.name || realUser?.email} ({realUser?.role})
        </span>
        <span className="text-gray-300">
          <strong className="text-gray-100">Using as:</strong>{' '}
          {effectiveUser?.name || effectiveUser?.email} ({effectiveUser?.role}
          {effectiveUser?.isTestUser ? ' · TEST' : ''})
        </span>
      </div>

      <select
        onChange={handleChange}
        disabled={loading || switching}
        className="w-full px-3 py-2 text-xs rounded-md border border-gray-600 bg-gray-900 text-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
        defaultValue=""
      >
        <option value="" disabled>
          {switching
            ? 'Switching...'
            : isImpersonating
            ? 'Change impersonation...'
            : 'Impersonate another user...'}
        </option>

        {isImpersonating && (
          <option value="__clear__">Stop impersonating (back to self)</option>
        )}

        {targets.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.email} ({u.role}
            {u.isTestUser ? ' · TEST' : ''})
          </option>
        ))}
      </select>

      {loading && <Skeleton className="w-full h-[40px]" />}
      {error && (
        <span className="text-[11px] text-red-400">{error}</span>
      )}
    </div>
  );
};

export default ImpersonateDropdown;
