import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { storageClient } from "@/lib/storage";
import { requireUser } from "@/lib/apiAuth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const id = Number(req.query.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file || file.deletedAt) return res.status(404).json({ error: "Not found" });

  try {
    const url = await storageClient.signedUrl(
      file.bucket,
      file.path,
      60 * 60
    );
    return res.status(200).json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to generate URL" });
  }
}
