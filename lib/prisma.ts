import { PrismaClient, Prisma } from "@prisma/client";

const SLOW_QUERY_THRESHOLD_MS = 300;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function extractQueryType(query: string): string {
  const match = query.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

function extractTableName(query: string): string {
  const fromMatch = query.match(/FROM\s+"?(\w+)"?/i);
  const intoMatch = query.match(/INTO\s+"?(\w+)"?/i);
  const updateMatch = query.match(/UPDATE\s+"?(\w+)"?/i);
  return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || "unknown";
}

function createPrismaClient() {
  // Use SUPABASE_DATABASE_URL if available (production), otherwise DATABASE_URL
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  
  // Add connection pool limits to prevent exhaustion
  const client = new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "warn", emit: "stdout" },
      { level: "error", emit: "stdout" },
    ],
    // Limit connection pool size for development stability
    datasourceUrl: dbUrl?.includes("?")
      ? `${dbUrl}&connection_limit=5`
      : `${dbUrl}?connection_limit=5`,
  });

  client.$on("query" as never, (e: Prisma.QueryEvent) => {
    if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
      console.log(
        JSON.stringify({
          level: "warn",
          type: "slow_query",
          timestamp: new Date().toISOString(),
          queryType: extractQueryType(e.query),
          table: extractTableName(e.query),
          durationMs: e.duration,
          threshold: SLOW_QUERY_THRESHOLD_MS,
        })
      );
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
