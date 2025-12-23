export type TimelineItemType =
  | "POLICY_EXPIRING"
  | "POLICY_EXPIRED"
  | "TASK_OVERDUE"
  | "VENTURE_ATTENTION"
  | "VENTURE_CRITICAL"
  | "FREIGHT_KPI_ALERT"
  | "HOTEL_KPI_ALERT";

export type TimelineSeverity = "info" | "warning" | "critical";

export interface OwnerTimelineItem {
  id: string;
  type: TimelineItemType;
  severity: TimelineSeverity;
  date: string;
  ventureId?: number;
  ventureName?: string;
  officeId?: number;
  officeName?: string;
  title: string;
  description?: string;
  url?: string;
}
