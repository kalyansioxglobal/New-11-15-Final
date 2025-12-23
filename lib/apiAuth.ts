import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "./effectiveUser";
import { canAccessAdminPanel, canUploadKpis } from "./permissions";
import type { SessionUser } from "./scope";

export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<SessionUser | null> {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    res.status(401).json({ error: "UNAUTHENTICATED" });
    return null;
  }
  return user;
}

export async function requireAdminUser(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  if (!canAccessAdminPanel(user.role)) {
    res.status(403).json({ error: "FORBIDDEN" });
    return null;
  }

  return user;
}

export const requireAdmin = requireAdminUser;
export const requireAdminPanelUser = requireAdminUser;

export async function requireUploadPermission(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  if (!canUploadKpis(user.role)) {
    res.status(403).json({ error: "FORBIDDEN - Upload permission required" });
    return null;
  }

  return user;
}

export async function requireLeadership(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionUser | null> {
  const user = await requireUser(req, res);
  if (!user) return null;

  const leadershipRoles = ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER"];
  if (!leadershipRoles.includes(user.role)) {
    res.status(403).json({ error: "FORBIDDEN - Leadership access required" });
    return null;
  }

  return user;
}
