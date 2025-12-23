import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "./prisma";

const defaultWindowMs = 60 * 1000; // 1 minute
const defaultMaxRequests = 30;

function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function getWindowStart(windowMs: number): Date {
  const now = Date.now();
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export async function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  routeKey = "default"
): Promise<boolean> {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === "development") return true;
  const ipHeader = req.headers["x-forwarded-for"];
  const rawIp =
    (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const ipHash = hashIdentifier(rawIp);
  const windowStart = getWindowStart(defaultWindowMs);
  const expiresAt = new Date(windowStart.getTime() + defaultWindowMs);

  try {
    await prisma.rateLimitWindow.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const record = await prisma.rateLimitWindow.upsert({
      where: {
        ipHash_routeKey_windowStart: { ipHash, routeKey, windowStart },
      },
      update: { hitCount: { increment: 1 } },
      create: { ipHash, routeKey, windowStart, expiresAt, hitCount: 1 },
    });

    if (record.hitCount > defaultMaxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Rate limit error:", error);
    return true;
  }
}

export async function rateLimitByEmail(
  res: NextApiResponse,
  email: string,
  routeKey: string,
  windowMs = 60 * 60 * 1000, // 1 hour default
  maxRequests = 10
): Promise<boolean> {
  // Disable rate limiting in development
  if (process.env.NODE_ENV === "development") return true;
  const emailHash = hashIdentifier(email.toLowerCase().trim());
  const windowStart = getWindowStart(windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);

  try {
    await prisma.rateLimitWindow.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const record = await prisma.rateLimitWindow.upsert({
      where: {
        ipHash_routeKey_windowStart: { ipHash: emailHash, routeKey, windowStart },
      },
      update: { hitCount: { increment: 1 } },
      create: { ipHash: emailHash, routeKey, windowStart, expiresAt, hitCount: 1 },
    });

    if (record.hitCount > maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Rate limit error:", error);
    return true;
  }
}
