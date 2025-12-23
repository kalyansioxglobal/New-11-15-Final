import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "@/lib/prisma";

type QuickLink = {
  id: string;
  name: string;
  url: string;
};

const MAX_LINKS = 50;
const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 2000;

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = parseInt(String(session.user.id), 10);
  if (isNaN(userId) || userId <= 0) {
    return res.status(401).json({ error: "Invalid user session" });
  }

  if (req.method === "GET") {
    try {
      const prefs = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      const layout = prefs?.layout as { quickLinks?: QuickLink[] } | null;
      const links = layout?.quickLinks || [];

      return res.status(200).json({ links });
    } catch (error) {
      console.error("Failed to fetch quick links:", error);
      return res.status(500).json({ error: "Failed to fetch quick links" });
    }
  }

  if (req.method === "PUT") {
    try {
      const { links } = req.body as { links: QuickLink[] };

      if (!Array.isArray(links)) {
        return res.status(400).json({ error: "Invalid links format" });
      }

      if (links.length > MAX_LINKS) {
        return res.status(400).json({ error: `Maximum ${MAX_LINKS} links allowed` });
      }

      const seenIds = new Set<string>();
      for (const link of links) {
        if (!link.id || typeof link.id !== "string") {
          return res.status(400).json({ error: "Each link must have a valid id" });
        }
        if (seenIds.has(link.id)) {
          return res.status(400).json({ error: "Duplicate link IDs not allowed" });
        }
        seenIds.add(link.id);

        if (!link.name || typeof link.name !== "string" || link.name.length > MAX_NAME_LENGTH) {
          return res.status(400).json({ error: `Link name must be a string up to ${MAX_NAME_LENGTH} characters` });
        }
        if (!link.url || typeof link.url !== "string" || link.url.length > MAX_URL_LENGTH) {
          return res.status(400).json({ error: `Link URL must be a string up to ${MAX_URL_LENGTH} characters` });
        }
        if (!isValidUrl(link.url)) {
          return res.status(400).json({ error: "Invalid URL format. URLs must start with http:// or https://" });
        }
      }

      const sanitizedLinks: QuickLink[] = links.map((link) => ({
        id: link.id.trim().slice(0, 50),
        name: link.name.trim().slice(0, MAX_NAME_LENGTH),
        url: link.url.trim().slice(0, MAX_URL_LENGTH),
      }));

      const existing = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      const existingLayout = (existing?.layout as Record<string, unknown>) || {};
      const newLayout = { ...existingLayout, quickLinks: sanitizedLinks };

      await prisma.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          layout: newLayout,
        },
        update: {
          layout: newLayout,
        },
      });

      return res.status(200).json({ success: true, links: sanitizedLinks });
    } catch (error) {
      console.error("Failed to save quick links:", error);
      return res.status(500).json({ error: "Failed to save quick links" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
