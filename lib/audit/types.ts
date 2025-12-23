export type ModuleSummary = {
  score: number;
  totalIssues: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type AuditIssueSummary = {
  id: string;
  module: string;
  severity: string;
  status: string;
  message: string;
  targetType: string;
  targetId: string;
  detectedAt: string;
};

export type AuditRunSummary = {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  overallScore: number | null;
  issues: AuditIssueSummary[];
};

export type LatestAuditResponse = {
  run: AuditRunSummary | null;
  moduleSummary: {
    FREIGHT: ModuleSummary;
    HOTEL: ModuleSummary;
    BPO: ModuleSummary;
    GLOBAL: ModuleSummary;
  } | null;
};
