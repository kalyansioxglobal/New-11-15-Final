import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import prisma from '@/lib/prisma';
import type { UserRole } from '@/lib/permissions';
import * as cookie from 'cookie';
import {
  IMPERSONATE_COOKIE,
  canImpersonateUser,
} from '@/lib/impersonation';
import { canImpersonate } from '@/lib/permissions';

type ApiUser = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  isTestUser: boolean;
};

type GetResponse = {
  realUser: ApiUser | null;
  effectiveUser: ApiUser | null;
  targets: ApiUser[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | { ok: boolean; error?: string }>
) {
  let realUserId: number;

  const session = await getServerSession(req, res, authOptions);

  if (session?.user && 'id' in session.user) {
    realUserId = Number((session.user as any).id);
  } else if (process.env.NODE_ENV === 'development') {
    realUserId = 1;
  } else {
    return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
  }

  const realUser = await prisma.user.findUnique({
    where: { id: realUserId },
  });

  if (!realUser) {
    return res.status(401).json({ ok: false, error: 'USER_NOT_FOUND' });
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, realUser);
    case 'POST':
      return handlePost(req, res, realUser);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
}

function toApiUser(u: any): ApiUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    role: u.role,
    isTestUser: !!u.isTestUser,
  };
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<GetResponse | { ok: boolean; error?: string }>,
  realUser: any
) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const impersonatedUserId = cookies[IMPERSONATE_COOKIE];

  let effectiveUser = realUser;

  if (
    impersonatedUserId &&
    canImpersonate(realUser.role as UserRole)
  ) {
    const target = await prisma.user.findUnique({
      where: { id: Number(impersonatedUserId) },
    });

    if (target && canImpersonateUser(realUser.role as UserRole, target)) {
      effectiveUser = target;
    }
  }

  let targets: any[] = [];
  if (canImpersonate(realUser.role as UserRole)) {
    if (realUser.role === 'TEST_USER') {
      targets = await prisma.user.findMany({
        where: {
          isTestUser: true,
          isActive: true,
          NOT: { id: realUser.id },
        },
        orderBy: { email: 'asc' },
      });
    } else {
      targets = await prisma.user.findMany({
        where: {
          isActive: true,
          NOT: { id: realUser.id },
        },
        orderBy: { email: 'asc' },
      });
    }
  }

  return res.status(200).json({
    realUser: toApiUser(realUser),
    effectiveUser: toApiUser(effectiveUser),
    targets: targets.map(toApiUser),
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean; error?: string }>,
  realUser: any
) {
  if (!canImpersonate(realUser.role as UserRole)) {
    return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  }

  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'INVALID_JSON' });
  }

  const targetUserId: number | null =
    body?.targetUserId === null || body?.targetUserId === ''
      ? null
      : Number(body?.targetUserId);

  if (!targetUserId) {
    res.setHeader(
      'Set-Cookie',
      cookie.serialize(IMPERSONATE_COOKIE, '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
      })
    );
    return res.status(200).json({ ok: true });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    return res.status(404).json({ ok: false, error: 'TARGET_NOT_FOUND' });
  }

  if (!canImpersonateUser(realUser.role as UserRole, target)) {
    return res.status(403).json({ ok: false, error: 'NOT_ALLOWED_FOR_TARGET' });
  }

  res.setHeader(
    'Set-Cookie',
    cookie.serialize(IMPERSONATE_COOKIE, String(targetUserId), {
      path: '/',
      maxAge: 60 * 60 * 8,
      httpOnly: true,
      sameSite: 'lax',
    })
  );

  return res.status(200).json({ ok: true });
}
