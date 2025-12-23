import useSWR from 'swr';

export type Role =
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
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isTestUser: boolean;
};

type ApiResponse = {
  realUser: ApiUser | null;
  effectiveUser: ApiUser | null;
  targets: ApiUser[];
};

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }
  return res.json();
};

export function useEffectiveUser() {
  const { data, isLoading } = useSWR<ApiResponse>('/api/impersonate', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });

  return {
    realUser: data?.realUser ?? null,
    effectiveUser: data?.effectiveUser ?? null,
    loading: isLoading,
  };
}
