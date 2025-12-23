import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import prisma from "../../../lib/prisma";
import { requireAdminUser } from '@/lib/apiAuth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await requireAdminUser(req, res);
  if (!user) return;

  try {
    if (req.method === "GET") {
      const ventures = await prisma.venture.findMany({
        include: { offices: true },
        orderBy: { name: "asc" },
      });

      return res.status(200).json({
        ventures: ventures.map((v: any) => ({
          ...v,
          officeCount: v.offices.length,
        })),
      });
    }

    if (req.method === "POST") {
      const { name, slug, type } = req.body as {
        name?: string;
        slug?: string;
        type?: string;
      };

      if (!name || !slug || !type) {
        return res
          .status(400)
          .json({ error: "name, slug and type are required" });
      }

      const venture = await prisma.venture.create({
        data: {
          name,
          slug,
          type: type as any,
        },
      });

      return res.status(201).json({ venture });
    }

    if (req.method === "PUT") {
      const { id, name, slug, type, isActive } = req.body as {
        id?: number;
        name?: string;
        slug?: string;
        type?: string;
        isActive?: boolean;
      };

      if (!id) {
        return res.status(400).json({ error: "id is required" });
      }

      const venture = await prisma.venture.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(type && { type: type as any }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
      });

      return res.status(200).json({ venture });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const numericId = Number(id);

      if (!numericId || Number.isNaN(numericId)) {
        return res.status(400).json({ error: "Valid id query param required" });
      }

      const venture = await prisma.venture.update({
        where: { id: numericId },
        data: { isActive: false },
      });

      return res.status(200).json({ venture });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return res.status(405).end("Method Not Allowed");
  } catch (error: any) {
    console.error(error);
    if ((error as any)?.code) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
