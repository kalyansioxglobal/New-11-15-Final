import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

type SessionWithUser = {
  user?: {
    id?: string | number;
    email?: string;
    name?: string;
  };
} | null;

export async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions) as SessionWithUser;
  return session?.user || null;
}
