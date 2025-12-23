import type { NextApiRequest, NextApiResponse } from "next";
import { getEffectiveUser } from "@/lib/effectiveUser";
import { prisma } from "@/lib/prisma";

// Local aliases for audit enums to avoid tight coupling with Prisma types.
type AuditModule = string;
type AuditSeverity = "INFO" | "WARNING" | "CRITICAL" | string;

function severityWeight(sev: AuditSeverity): number {
  switch (sev) {
    case "CRITICAL":
      return 30;
    case "HIGH":
      return 20;
    case "MEDIUM":
      return 10;
    case "LOW":
    default:
      return 5;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await getEffectiveUser(req, res);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const run = await prisma.auditRun.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      issues: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!run) {
    return res.status(200).json({ run: null, moduleSummary: null });
  }

  const modules: AuditModule[] = [
    "FREIGHT",
    "HOTEL",
    "BPO",
    "GLOBAL",
  ];

  const moduleSummary: Record<
    AuditModule,
    {
      score: number;
      totalIssues: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }
  > = {} as Record<
    AuditModule,
    {
      score: number;
      totalIssues: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    }
  >;

  for (const m of modules) {
    const moduleIssues = run.issues.filter((i: any) => i.module === m);

    let maxScore = 0;
    let score = 0;

    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const issue of moduleIssues) {
      const w = severityWeight(issue.severity);
      maxScore += w;
      score += Math.max(0, w - 1);

      if (issue.severity === "CRITICAL") critical++;
      else if (issue.severity === "HIGH") high++;
      else if (issue.severity === "MEDIUM") medium++;
      else low++;
    }

    const finalScore =
      maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;

    moduleSummary[m] = {
      score: finalScore,
      totalIssues: moduleIssues.length,
      critical,
      high,
      medium,
      low,
    };
  }

  return res.status(200).json({ run, moduleSummary });
}
