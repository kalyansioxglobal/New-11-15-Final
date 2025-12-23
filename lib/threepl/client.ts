import { getThreePlConfig } from '@/lib/config/threepl';
import { logger } from '@/lib/logger';

export type ThreePlResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
};

export type ThreePlLoad = {
  loadId: string;
  referenceNumber?: string;
  status?: string;
  modifiedDate?: string;
  pickupDate?: string;
  deliveryDate?: string;
};

export type ThreePlTracking = {
  loadId: string;
  status?: string;
  updatedAt?: string;
};

export type ThreePlDocument = {
  id: string;
  type?: string;
  fileName?: string;
  mimeType?: string;
  url?: string;
  createdAt?: string;
  sizeBytes?: number;
  source?: string;
};

type TokenState = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

let tokenState: TokenState | null = null;

async function fetchToken(): Promise<TokenState> {
  const cfg = getThreePlConfig();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error('threepl_token_error', { meta: { status: res.status, body: text.slice(0, 500) } });
    throw new Error(`Failed to fetch 3PL token (${res.status})`);
  }

  const json: any = await res.json();
  const accessToken = json.access_token as string;
  const expiresIn = Number(json.expires_in || 3000);
  const expiresAt = Date.now() + Math.max(expiresIn - 60, 60) * 1000; // refresh 60s early

  if (!accessToken) {
    logger.error('threepl_token_missing', { meta: { body: json } });
    throw new Error('3PL token response missing access_token');
  }

  tokenState = { accessToken, expiresAt };
  return tokenState;
}

function isTokenValid(state: TokenState | null): state is TokenState {
  if (!state) return false;
  return Date.now() < state.expiresAt - 5000;
}

async function getAccessToken(): Promise<string> {
  if (isTokenValid(tokenState)) return tokenState!.accessToken;
  const next = await fetchToken();
  return next.accessToken;
}

type HttpMethod = 'GET' | 'POST';

type RequestOptions = {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string | number | undefined | null>;
  body?: any;
};

async function request<T>(options: RequestOptions, retry = true): Promise<ThreePlResult<T>> {
  const cfg = getThreePlConfig();
  const token = await getAccessToken();

  const url = new URL(options.path.startsWith('http') ? options.path : `${cfg.baseUrl}${options.path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.append(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && retry) {
    tokenState = null; // force refresh
    return request<T>(options, false);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    logger.error('threepl_request_error', {
      meta: {
        path: options.path,
        status: res.status,
      },
    });
    return { ok: false, status: res.status, error: data?.error || data?.message || 'Request failed' };
  }

  return { ok: true, status: res.status, data };
}

function iso(date: Date | string | undefined) {
  if (!date) return undefined;
  return typeof date === 'string' ? new Date(date).toISOString() : date.toISOString();
}

export async function getLoads(params: { fromModifiedDate: Date; toModifiedDate?: Date; }): Promise<ThreePlResult<ThreePlLoad[]>> {
  const { fromModifiedDate, toModifiedDate } = params;
  return request<ThreePlLoad[]>({
    path: '/getLoads',
    query: {
      fromModifiedDate: iso(fromModifiedDate),
      toModifiedDate: iso(toModifiedDate),
    },
  });
}

export async function getGlobalTracking(params: { fromDate?: Date; toDate?: Date; loadId?: string }): Promise<ThreePlResult<ThreePlTracking[]>> {
  const { fromDate, toDate, loadId } = params;
  return request<ThreePlTracking[]>({
    path: '/globalTracking',
    query: {
      fromDate: iso(fromDate),
      toDate: iso(toDate),
      loadId,
    },
  });
}

export async function getShipmentDocuments(params: { loadId: string }): Promise<ThreePlResult<ThreePlDocument[]>> {
  return request<ThreePlDocument[]>({
    path: `/getShipmentDocuments/${encodeURIComponent(params.loadId)}`,
  });
}

export function clearThreePlTokenCache() {
  tokenState = null;
}

