import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingMessage, ServerResponse } from 'http';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import * as cookie from 'cookie';
import { IMPERSONATE_COOKIE, canImpersonateUser } from '@/lib/impersonation';
import type { SessionUser, Role } from './scope';

type UserWithVenturesAndOffices = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
  isTestUser: boolean;
  ventures: { ventureId: number }[];
  offices: { officeId: number }[];
};

type RequestLike = NextApiRequest | (IncomingMessage & { cookies: Partial<Record<string, string>> });
type ResponseLike = NextApiResponse | ServerResponse;

export async function getEffectiveUser(
  req: RequestLike,
  res: ResponseLike
): Promise<SessionUser | null> {
  let realUserId: number;

  const session = await getServerSession(req, res, authOptions);

  if (session?.user && 'id' in session.user) {
    realUserId = Number((session.user as { id: string | number }).id);
  } else if (process.env.NODE_ENV === 'development') {
    realUserId = 1;
  } else {
    return null;
  }

  const realUser = await prisma.user.findUnique({
    where: { id: realUserId },
    include: {
      ventures: true,
      offices: true,
    },
  });

  if (!realUser) return null;

  const cookies = cookie.parse(req.headers.cookie || '');
  const impersonatedUserId = cookies[IMPERSONATE_COOKIE];

  let effective = realUser;

  if (impersonatedUserId) {
    const target = await prisma.user.findUnique({
      where: { id: Number(impersonatedUserId) },
      include: {
        ventures: true,
        offices: true,
      },
    });

    if (target && canImpersonateUser(realUser.role, target)) {
      effective = target;
    }
  }

  return {
    id: effective.id,
    email: effective.email,
    fullName: effective.fullName ?? null,
    name: effective.fullName ?? null, // Legacy alias
    role: effective.role as Role,
    isTestUser: !!effective.isTestUser,
    ventureIds: effective.ventures.map((v) => v.ventureId),
    officeIds: effective.offices.map((o) => o.officeId),
  };
}
