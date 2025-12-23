import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAuditChecks() {
  const checks = [
    // ---------- FREIGHT ----------
    {
      key: "freight.negative_margin_loads",
      module: "FREIGHT",
      severity: "HIGH",
      name: "Negative margin loads",
      description: "Loads where buyAmount > sellAmount and status = COMPLETED.",
    },
    {
      key: "freight.completed_missing_delivered_at",
      module: "FREIGHT",
      severity: "MEDIUM",
      name: "Completed loads missing deliveredAt",
      description: "Freight loads marked COMPLETED but deliveredAt is null.",
    },
    {
      key: "freight.zero_miles_with_revenue",
      module: "FREIGHT",
      severity: "MEDIUM",
      name: "Loads with revenue but zero miles",
      description: "Loads where paidMiles is null/0 but sellAmount > 0.",
    },
    {
      key: "freight.completed_missing_carrier",
      module: "FREIGHT",
      severity: "MEDIUM",
      name: "Completed loads missing carrier",
      description: "Freight loads marked COMPLETED with no carrierId set.",
    },
    {
      key: "freight.old_draft_loads",
      module: "FREIGHT",
      severity: "LOW",
      name: "Stale draft loads",
      description: "Draft loads older than 14 days.",
    },

    // ---------- HOTEL ----------
    {
      key: "hotel.rooms_sold_gt_available",
      module: "HOTEL",
      severity: "HIGH",
      name: "Rooms sold > rooms available",
      description: "Hotel daily reports where roomsSold exceeds roomsAvailable.",
    },
    {
      key: "hotel.revenue_zero_but_occupied",
      module: "HOTEL",
      severity: "MEDIUM",
      name: "Zero room revenue but occupancy > 0",
      description: "Hotel reports with roomsSold > 0 but roomRevenue = 0.",
    },
    {
      key: "hotel.missing_recent_reports_per_property",
      module: "HOTEL",
      severity: "HIGH",
      name: "Missing last 3 days of reports",
      description: "Properties without daily reports in the last 3 business days.",
    },
    {
      key: "hotel.excessive_loss_nights",
      module: "HOTEL",
      severity: "MEDIUM",
      name: "Too many high loss nights",
      description: "Properties with 3+ highLossFlag days in the last 7 days.",
    },
    {
      key: "hotel.negative_room_counts",
      module: "HOTEL",
      severity: "CRITICAL",
      name: "Negative room counts",
      description: "Daily reports where roomsAvailable or roomsSold is negative.",
    },

    // ---------- SECURITY / GLOBAL ----------
    {
      key: "security.api_routes_missing_config",
      module: "GLOBAL",
      severity: "HIGH",
      name: "API routes missing security config",
      description: "Critical / external / auth API routes not registered in ApiRouteConfig.",
    },
    {
      key: "security.api_routes_missing_auth",
      module: "GLOBAL",
      severity: "CRITICAL",
      name: "API routes that require auth but are not protected",
      description: "ApiRouteConfig entries where requiresAuth = true but isAuthProtected = false.",
    },
    {
      key: "security.api_routes_missing_rate_limit",
      module: "GLOBAL",
      severity: "MEDIUM",
      name: "External/paid API routes missing rate limiting",
      description: "Routes that call external paid APIs but are not rate limited.",
    },

    // ---------- BASIC RBAC / INTEGRITY ----------
    {
      key: "rbac.freight_loads_missing_venture_or_office",
      module: "FREIGHT",
      severity: "HIGH",
      name: "Freight loads missing venture or office",
      description: "Non-draft loads without ventureId or officeId, breaking scoping.",
    },
    {
      key: "rbac.hotel_reports_missing_property_link",
      module: "HOTEL",
      severity: "HIGH",
      name: "Hotel daily reports missing propertyId",
      description: "HotelDailyReport rows with no propertyId.",
    },
  ];

  for (const c of checks) {
    await prisma.auditCheck.upsert({
      where: { key: c.key },
      create: c,
      update: c,
    });
  }
  console.log(`Seeded ${checks.length} audit checks.`);
}

async function seedApiRouteConfigs() {
  const routes = [
    {
      path: "/api/logistics/customer-approval-requests",
      description: "Customer approval requests (Twilio/SendGrid/WHOISXML).",
      module: "FREIGHT",
      usesExternalService: true,
      requiresAuth: true,
      requiresRateLimit: true,
    },
    {
      path: "/api/logistics/fmcsa-carrier-lookup",
      description: "FMCSA carrier lookup.",
      module: "FREIGHT",
      usesExternalService: true,
      requiresAuth: true,
      requiresRateLimit: true,
    },
    {
      path: "/api/hotels/daily-report/import",
      description: "Import hotel daily reports.",
      module: "HOTEL",
      usesExternalService: false,
      requiresAuth: true,
      requiresRateLimit: false,
    },
    {
      path: "/api/auth/send-otp",
      description: "OTP sender.",
      module: "GLOBAL",
      usesExternalService: true,
      requiresAuth: false,
      requiresRateLimit: true,
    },
  ];

  for (const r of routes) {
    await prisma.apiRouteConfig.upsert({
      where: { path: r.path },
      create: r,
      update: r,
    });
  }
  console.log(`Seeded ${routes.length} API route configs.`);
}

async function main() {
  await seedAuditChecks();
  await seedApiRouteConfigs();
  console.log("Done seeding audit checks + API route configs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
