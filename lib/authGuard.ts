import type { NextApiRequest, NextApiResponse } from "next";
import type { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import prisma from "./prisma";
import { DEFAULT_PERMISSION_MATRIX, canManageUsersMatrix, PermissionMatrixJson } from "./permissions";

export async function requireAdminUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return null;
  }

  let matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX;
  const record = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });
  if (record) matrix = record.json as PermissionMatrixJson;

  if (!canManageUsersMatrix(dbUser.role, matrix)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return { dbUser, matrix };
}

export async function requireAdminUserSSR(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user?.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser) {
    return null;
  }

  let matrix: PermissionMatrixJson = DEFAULT_PERMISSION_MATRIX;
  const record = await prisma.permissionMatrix.findUnique({ where: { id: 1 } });
  if (record) matrix = record.json as PermissionMatrixJson;

  if (!canManageUsersMatrix(dbUser.role, matrix)) {
    return null;
  }

  return { dbUser, matrix };
}

export async function getAuthUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      ventures: { include: { venture: true } },
      offices: { include: { office: true } },
    },
  });

  return dbUser;
}
