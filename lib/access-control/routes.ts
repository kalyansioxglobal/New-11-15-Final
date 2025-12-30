import type { UserRole } from "@/lib/permissions";

export type ModuleId =
  | "command_center"
  | "operations"
  | "it"
  | "freight"
  | "dispatch"
  | "hospitality"
  | "bpo"
  | "saas"
  | "holdings"
  | "admin"
  | "public";

export type RouteConfig = {
  id: string;
  path: string;
  roles?: UserRole[];
  module: ModuleId;
  exact?: boolean;
  apiPath?: string;
  label?: string;
  icon?: string;
  showInNav?: boolean;
};

export const ROUTE_REGISTRY: RouteConfig[] = [
  // ═══════════════════════════════════════════════════════════════
  // COMMAND CENTER
  // ═══════════════════════════════════════════════════════════════
  {
    id: "my_day",
    path: "/my-day",
    module: "command_center",
    label: "My Day",
    icon: "☀️",
    showInNav: true,
  },
  {
    id: "overview",
    path: "/overview",
    apiPath: "/api/overview",
    module: "command_center",
    exact: true,
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Overview",
    icon: "📊",
    showInNav: true,
  },
  {
    id: "ventures",
    path: "/ventures",
    apiPath: "/api/ventures",
    module: "command_center",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Ventures",
    icon: "🏢",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "tasks",
    path: "/tasks",
    apiPath: "/api/tasks",
    module: "operations",
    label: "Tasks",
    icon: "✅",
    showInNav: true,
  },
  {
    id: "tasks_board",
    path: "/tasks/board",
    module: "operations",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Tasks Board",
    icon: "📋",
    showInNav: true,
  },
  {
    id: "insurance",
    path: "/policies",
    apiPath: "/api/policies",
    module: "operations",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE", "AUDITOR"],
    label: "Insurance",
    icon: "🛡️",
    showInNav: true,
  },
  {
    id: "eod_reports",
    path: "/eod-reports/submit",
    apiPath: "/api/eod-reports",
    module: "operations",
    label: "EOD Reports",
    icon: "📝",
    showInNav: true,
  },
  {
    id: "eod_team",
    path: "/eod-reports/team",
    module: "operations",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "HR_ADMIN"],
    label: "Team Reports",
    icon: "👥",
    showInNav: true,
  },
  {
    id: "attendance",
    path: "/attendance/team",
    apiPath: "/api/attendance",
    module: "operations",
    label: "Attendance",
    icon: "📅",
    showInNav: true,
  },
  {
    id: "attendance_team",
    path: "/attendance/team",
    apiPath: "/api/attendance/team",
    module: "operations",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "HR_ADMIN"],
    label: "Team Attendance",
    icon: "👥",
    showInNav: true,
  },
  {
    id: "feedback",
    path: "/feedback",
    apiPath: "/api/feedback",
    module: "operations",
    label: "Feedback",
    icon: "💬",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // IT
  // ═══════════════════════════════════════════════════════════════
  {
    id: "it_management",
    path: "/it",
    apiPath: "/api/it",
    module: "it",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "HR_ADMIN"],
    label: "IT Management",
    icon: "💻",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // FREIGHT
  // ═══════════════════════════════════════════════════════════════
  {
    id: "logistics_dashboard",
    path: "/logistics/dashboard",
    apiPath: "/api/logistics/dashboard",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "AUDITOR", "FINANCE"],
    label: "Dashboard",
    icon: "📈",
    showInNav: true,
  },
  {
    id: "freight_loads",
    path: "/freight/loads",
    apiPath: "/api/freight/loads",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR", "CARRIER_TEAM"],
    label: "Loads",
    icon: "📦",
    showInNav: true,
  },
  {
    id: "freight_carriers",
    path: "/freight/carriers",
    apiPath: "/api/freight/carriers",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CARRIER_TEAM"],
    label: "Carriers",
    icon: "🚛",
    showInNav: true,
  },
  {
    id: "logistics_shippers",
    path: "/logistics/shippers",
    apiPath: "/api/logistics/shippers",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR"],
    label: "Shippers (Locations)",
    icon: "🏭",
    showInNav: true,
  },
  {
    id: "logistics_customers",
    path: "/logistics/customers",
    apiPath: "/api/logistics/customers",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR", "DISPATCHER"],
    label: "Shippers (Accounts)",
    icon: "👥",
    showInNav: true,
  },
  {
    id: "freight_kpis",
    path: "/freight/kpi",
    apiPath: "/api/freight/kpi",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Freight KPIs",
    icon: "📊",
    showInNav: true,
  },
  {
    id: "freight_sales_kpi",
    path: "/freight/sales-kpi",
    apiPath: "/api/freight-kpi/sales",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Sales KPIs",
    icon: "📞",
    showInNav: true,
  },
  {
    id: "freight_pnl",
    path: "/freight/pnl",
    apiPath: "/api/freight/pnl",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Freight P&L",
    icon: "💰",
    showInNav: true,
  },
  {
    id: "freight_missing_mappings",
    path: "/logistics/missing-mappings",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER"],
    label: "Missing Mappings",
    icon: "🔗",
    showInNav: true,
  },
  {
    id: "freight_customer_approval",
    path: "/logistics/customer-approval-request",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR", "DISPATCHER", "ACCOUNTING"],
    label: "Shipper Approval",
    icon: "📝",
    showInNav: true,
  },
  {
    id: "freight_shipper_health",
    path: "/freight/shipper-health",
    apiPath: "/api/freight/shipper-health",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "Shipper Health",
    icon: "💚",
    showInNav: true,
  },
  {
    id: "freight_coverage",
    path: "/freight/coverage-war-room",
    apiPath: "/api/freight/coverage-war-room",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "Coverage War Room",
    icon: "📊",
    showInNav: true,
  },
  {
    id: "freight_outreach_war_room",
    path: "/freight/outreach-war-room",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "Outreach War Room",
    icon: "📨",
    showInNav: true,
  },
  {
    id: "freight_ai_tools",
    path: "/freight/ai-tools",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "AI Tools",
    icon: "🤖",
    showInNav: true,
  },
  {
    id: "freight_dormant_customers",
    path: "/freight/dormant-customers",
    apiPath: "/api/freight/dormant-customers",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR"],
    label: "Dormant Customers",
    icon: "😴",
    showInNav: true,
  },
  {
    id: "freight_lost_at_risk",
    path: "/freight/lost-and-at-risk",
    apiPath: "/api/freight/lost-loads",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "Lost & At-Risk",
    icon: "⚠️",
    showInNav: true,
  },
  {
    id: "dispatcher_dashboard",
    path: "/dispatcher/dashboard",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Dispatcher View",
    icon: "📟",
    showInNav: true,
  },
  {
    id: "csr_dashboard",
    path: "/csr/dashboard",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR"],
    label: "CSR View",
    icon: "🎧",
    showInNav: true,
  },
  {
    id: "freight_tasks",
    path: "/freight/tasks",
    apiPath: "/api/freight/tasks",
    module: "freight",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER", "CSR"],
    label: "Freight Tasks",
    icon: "📋",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // DISPATCH (Transport)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "dispatch_dashboard",
    path: "/dispatch",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Dispatch Hub",
    icon: "🚚",
    showInNav: true,
  },
  {
    id: "dispatch_inbox",
    path: "/dispatch/inbox",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Inbox",
    icon: "📥",
    showInNav: true,
  },
  {
    id: "dispatch_loads",
    path: "/dispatch/loads",
    apiPath: "/api/dispatch/loads",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Dispatch Loads",
    icon: "📦",
    showInNav: true,
  },
  {
    id: "dispatch_drivers",
    path: "/dispatch/drivers",
    apiPath: "/api/dispatch/drivers",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Drivers",
    icon: "🧑‍✈️",
    showInNav: true,
  },
  {
    id: "dispatch_settlements",
    path: "/dispatch/settlements",
    apiPath: "/api/dispatch/settlements",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"],
    label: "Settlements",
    icon: "💵",
    showInNav: true,
  },
  {
    id: "dispatch_trucks",
    path: "/dispatch/trucks",
    apiPath: "/api/dispatch/trucks",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "DISPATCHER"],
    label: "Trucks",
    icon: "🚚",
    showInNav: true,
  },
  {
    id: "dispatch_settings",
    path: "/dispatch/settings",
    module: "dispatch",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER"],
    label: "Dispatch Settings",
    icon: "⚙️",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // HOSPITALITY
  // ═══════════════════════════════════════════════════════════════
  {
    id: "hospitality_dashboard",
    path: "/hospitality/dashboard",
    apiPath: "/api/hospitality/dashboard",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "AUDITOR", "FINANCE"],
    label: "Dashboard",
    icon: "📈",
    showInNav: true,
  },
  {
    id: "hotel_properties",
    path: "/hospitality/hotels",
    apiPath: "/api/hospitality/hotels",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Hotels",
    icon: "🏨",
    showInNav: true,
  },
  {
    id: "hotel_reviews",
    path: "/hospitality/reviews",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR"],
    label: "Reviews",
    icon: "⭐",
    showInNav: true,
  },
  {
    id: "hotel_issues",
    path: "/hotels/issues",
    apiPath: "/api/hotels/issues",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"],
    label: "Issues",
    icon: "⚖️",
    showInNav: true,
  },
  {
    id: "hotel_kpis",
    path: "/hotels/kpis",
    apiPath: "/api/hotels/kpi-comparison",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "Hotel KPIs",
    icon: "📊",
    showInNav: true,
  },
  {
    id: "hotel_pnl",
    path: "/admin/hotels/pnl",
    apiPath: "/api/hotels/pnl/monthly",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"],
    label: "Hotel P&L",
    icon: "💰",
    showInNav: true,
  },
  {
    id: "hotel_ai_outreach",
    path: "/hotels/ai/outreach-draft",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "AI Outreach Draft",
    icon: "🤖",
    showInNav: true,
  },
  {
    id: "hotel_disputes",
    path: "/hotels/disputes",
    apiPath: "/api/hotels/disputes",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"],
    label: "Disputes",
    icon: "⚖️",
    showInNav: true,
  },
  {
    id: "hotel_kpi_upload",
    path: "/hotels/kpi-upload",
    module: "hospitality",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER"],
    label: "KPI Upload",
    icon: "📤",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // BPO
  // ═══════════════════════════════════════════════════════════════
  {
    id: "bpo_dashboard",
    path: "/bpo/dashboard",
    apiPath: "/api/bpo/dashboard",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "AUDITOR", "FINANCE"],
    label: "Dashboard",
    icon: "📈",
    showInNav: true,
  },
  {
    id: "bpo_campaigns",
    path: "/bpo/campaigns",
    apiPath: "/api/bpo/campaigns",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Campaigns",
    icon: "📞",
    showInNav: true,
  },
  {
    id: "bpo_agents",
    path: "/bpo/agents",
    apiPath: "/api/bpo/agents",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Agents",
    icon: "👥",
    showInNav: true,
  },
  {
    id: "bpo_realtime",
    path: "/bpo/realtime",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Real-time",
    icon: "📡",
    showInNav: true,
  },
  {
    id: "bpo_kpi",
    path: "/bpo/kpi",
    apiPath: "/api/bpo/kpi",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "AUDITOR", "FINANCE"],
    label: "BPO KPIs",
    icon: "📊",
    showInNav: true,
  },
  {
    id: "bpo_incentives",
    path: "/bpo/incentives",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE"],
    label: "Incentives",
    icon: "💰",
    showInNav: true,
  },
  {
    id: "bpo_ai_client_draft",
    path: "/bpo/ai/client-draft",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "AI Client Draft",
    icon: "🤖",
    showInNav: true,
  },
  {
    id: "bpo_call_logs",
    path: "/bpo/call-logs",
    apiPath: "/api/bpo/call-logs",
    module: "bpo",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD"],
    label: "Call Logs",
    icon: "📋",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // SAAS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "saas_customers",
    path: "/saas/customers",
    apiPath: "/api/saas/customers",
    module: "saas",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "TEAM_LEAD", "CSR"],
    label: "Customers",
    icon: "💼",
    showInNav: true,
  },
  {
    id: "saas_subscriptions",
    path: "/saas/subscriptions",
    apiPath: "/api/saas/subscriptions",
    module: "saas",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
    label: "Subscriptions",
    icon: "📋",
    showInNav: true,
  },
  {
    id: "saas_metrics",
    path: "/saas/metrics",
    apiPath: "/api/saas/metrics",
    module: "saas",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE", "AUDITOR"],
    label: "MRR/ARR Metrics",
    icon: "📈",
    showInNav: true,
  },
  {
    id: "sales_kpi",
    path: "/sales/sales-kpi",
    module: "saas",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "OFFICE_MANAGER", "FINANCE", "AUDITOR"],
    label: "Sales KPIs",
    icon: "📊",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // HOLDINGS
  // ═══════════════════════════════════════════════════════════════
  {
    id: "holdings_assets",
    path: "/holdings/assets",
    apiPath: "/api/holdings/assets",
    module: "holdings",
    roles: ["CEO", "ADMIN", "COO", "FINANCE"],
    label: "Assets",
    icon: "🏠",
    showInNav: true,
  },
  {
    id: "holdings_bank",
    path: "/holdings/bank",
    apiPath: "/api/holdings/bank",
    module: "holdings",
    roles: ["CEO", "ADMIN", "COO", "FINANCE"],
    label: "Bank Snapshots",
    icon: "🏦",
    showInNav: true,
  },
  {
    id: "holdings_documents",
    path: "/holdings/documents",
    apiPath: "/api/holdings/assets",
    module: "holdings",
    roles: ["CEO", "ADMIN", "COO", "FINANCE"],
    label: "Document Vault",
    icon: "📁",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════
  {
    id: "data_import",
    path: "/import",
    apiPath: "/api/import",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO", "FINANCE"],
    label: "Data Import",
    icon: "🔄",
    showInNav: true,
  },
  {
    id: "admin_users",
    path: "/admin/users",
    apiPath: "/api/admin/users",
    module: "admin",
    roles: ["CEO", "ADMIN", "HR_ADMIN"],
    label: "Users",
    icon: "👤",
    showInNav: true,
  },
  {
    id: "admin_offices",
    path: "/admin/offices",
    apiPath: "/api/admin/offices",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO"],
    label: "Offices",
    icon: "🏬",
    showInNav: true,
  },
  {
    id: "admin_ventures",
    path: "/admin/ventures",
    apiPath: "/api/admin/ventures",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "Manage Ventures",
    icon: "🏛️",
    showInNav: true,
  },
  {
    id: "admin_policies",
    path: "/admin/policies",
    apiPath: "/api/admin/policies",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO"],
    label: "Manage Policies",
    icon: "📜",
    showInNav: true,
  },
  {
    id: "admin_roles",
    path: "/admin/roles",
    apiPath: "/api/admin/roles",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "Role Matrix",
    icon: "🔐",
    showInNav: true,
  },
  {
    id: "user_preferences",
    path: "/settings/preferences",
    apiPath: "/api/user/preferences",
    module: "admin",
    label: "Preferences",
    icon: "⚙️",
    showInNav: true,
  },
  {
    id: "incentives",
    path: "/admin/incentives",
    apiPath: "/api/incentives",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD", "FINANCE"],
    label: "Incentives",
    icon: "🏆",
    showInNav: true,
  },
  {
    id: "gamification",
    path: "/gamification",
    apiPath: "/api/gamification",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO", "VENTURE_HEAD"],
    label: "Gamification",
    icon: "🎮",
    showInNav: true,
  },
  {
    id: "audit",
    path: "/admin/audit",
    apiPath: "/api/admin/audit",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO"],
    label: "Audit",
    icon: "🔍",
    showInNav: true,
  },
  {
    id: "activity_log",
    path: "/admin/activity-log",
    apiPath: "/api/admin/activity-log",
    module: "admin",
    roles: ["CEO", "ADMIN", "COO", "AUDITOR"],
    label: "Activity Log",
    icon: "📜",
    showInNav: true,
  },
  {
    id: "explanations",
    path: "/admin/explanations",
    apiPath: "/api/admin/explanations",
    module: "admin",
    roles: ["CEO", "ADMIN", "HR_ADMIN"],
    label: "Explanations",
    icon: "📋",
    showInNav: true,
  },
  {
    id: "org_chart",
    path: "/admin/org-chart",
    apiPath: "/api/admin/org-chart",
    module: "admin",
    roles: ["CEO", "ADMIN", "HR_ADMIN", "COO"],
    label: "Org Chart",
    icon: "🏛️",
    showInNav: true,
  },
  {
    id: "admin_ai_usage",
    path: "/admin/ai-usage",
    apiPath: "/api/admin/ai-usage",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "AI Usage",
    icon: "🤖",
    showInNav: true,
  },
  {
    id: "admin_quarantine",
    path: "/admin/quarantine",
    apiPath: "/api/admin/quarantine",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "Webhook Quarantine",
    icon: "📥",
    showInNav: true,
  },
  {
    id: "admin_ai_templates",
    path: "/admin/ai-templates",
    apiPath: "/api/admin/ai-templates",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "AI Templates",
    icon: "📝",
    showInNav: true,
  },
  {
    id: "admin_jobs",
    path: "/admin/jobs",
    apiPath: "/api/admin/jobs",
    module: "admin",
    roles: ["CEO", "ADMIN"],
    label: "System Jobs",
    icon: "⚡",
    showInNav: true,
  },
  {
    id: "my_incentives",
    path: "/incentives/my",
    apiPath: "/api/me/incentives",
    module: "admin",
    label: "My Incentives",
    icon: "💸",
    showInNav: true,
  },
  {
    id: "employee_dashboard",
    path: "/employee/dashboard",
    module: "command_center",
    label: "Employee Hub",
    icon: "🏠",
    showInNav: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC (no auth required)
  // ═══════════════════════════════════════════════════════════════
  {
    id: "login",
    path: "/login",
    module: "public",
    showInNav: false,
  },
  {
    id: "carrier_portal",
    path: "/carrier-portal",
    apiPath: "/api/carrier-portal",
    module: "public",
    showInNav: false,
  },
];

export const MODULE_LABELS: Record<ModuleId, string> = {
  command_center: "Main",
  operations: "Operations",
  it: "IT",
  freight: "Freight",
  dispatch: "Dispatch",
  hospitality: "Hospitality",
  bpo: "BPO",
  saas: "SaaS",
  holdings: "Holdings",
  admin: "Admin",
  public: "Public",
};

export function getRouteById(id: string): RouteConfig | undefined {
  return ROUTE_REGISTRY.find((r) => r.id === id);
}

export function getRouteByPath(path: string): RouteConfig | undefined {
  return ROUTE_REGISTRY.find((route) => {
    if (route.exact) {
      return route.path === path;
    }
    return path === route.path || path.startsWith(route.path + "/");
  });
}

export function getRouteByApiPath(apiPath: string): RouteConfig | undefined {
  return ROUTE_REGISTRY.find((route) => {
    if (!route.apiPath) return false;
    return apiPath === route.apiPath || apiPath.startsWith(route.apiPath + "/");
  });
}

export function getRoutesByModule(module: ModuleId): RouteConfig[] {
  return ROUTE_REGISTRY.filter((r) => r.module === module);
}

export function getNavRoutes(): RouteConfig[] {
  return ROUTE_REGISTRY.filter((r) => r.showInNav === true);
}
