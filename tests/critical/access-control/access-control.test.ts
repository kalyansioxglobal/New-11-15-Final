import {
  ROUTE_REGISTRY,
  getRouteByPath,
  getRouteByApiPath,
  getRouteById,
  getNavRoutes,
} from "@/lib/access-control/routes";
import {
  checkPageAccess,
  checkApiAccess,
  canAccessRoute,
  getAccessibleRoutes,
  getNavItemsForRole,
  isRouteRegistered,
} from "@/lib/access-control/guard";
import {
  isModuleEnabled,
  setFeatureFlag,
  clearFeatureFlagOverrides,
} from "@/lib/access-control/feature-flags";
import {
  auditPageRoute,
  auditApiRoute,
  validateNewRoute,
} from "@/lib/access-control/enforce";
import type { UserRole } from "@/lib/permissions";

describe("Access Control - Route Registry", () => {
  test("ROUTE_REGISTRY has unique ids", () => {
    const ids = ROUTE_REGISTRY.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  test("ROUTE_REGISTRY has unique paths", () => {
    const paths = ROUTE_REGISTRY.map((r) => r.path);
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
  });

  test("getRouteByPath finds exact match", () => {
    const route = getRouteByPath("/my-day");
    expect(route).toBeDefined();
    expect(route?.id).toBe("my_day");
  });

  test("getRouteByPath finds prefix match", () => {
    const route = getRouteByPath("/freight/loads/123");
    expect(route).toBeDefined();
    expect(route?.id).toBe("freight_loads");
  });

  test("getRouteById finds route", () => {
    const route = getRouteById("logistics_dashboard");
    expect(route).toBeDefined();
    expect(route?.path).toBe("/logistics/dashboard");
  });

  test("getNavRoutes returns only showInNav routes", () => {
    const navRoutes = getNavRoutes();
    expect(navRoutes.every((r) => r.showInNav === true)).toBe(true);
    expect(navRoutes.length).toBeGreaterThan(0);
  });
});

describe("Access Control - Guard", () => {
  test("checkPageAccess allows public routes without auth", () => {
    const result = checkPageAccess("/login", { isAuthenticated: false });
    expect(result.allowed).toBe(true);
  });

  test("checkPageAccess allows unrestricted routes for any role", () => {
    const result = checkPageAccess("/my-day", {
      role: "EMPLOYEE" as UserRole,
      isAuthenticated: true,
    });
    expect(result.allowed).toBe(true);
  });

  test("checkPageAccess denies restricted route for wrong role", () => {
    const result = checkPageAccess("/logistics/dashboard", {
      role: "DISPATCHER" as UserRole,
      isAuthenticated: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("role_denied");
  });

  test("checkPageAccess allows restricted route for correct role", () => {
    const result = checkPageAccess("/logistics/dashboard", {
      role: "CEO" as UserRole,
      isAuthenticated: true,
    });
    expect(result.allowed).toBe(true);
  });

  test("checkApiAccess allows auth routes", () => {
    const result = checkApiAccess("/api/auth/session", {
      isAuthenticated: false,
    });
    expect(result.allowed).toBe(true);
  });

  test("checkApiAccess denies unauthenticated for protected routes", () => {
    const result = checkApiAccess("/api/freight/kpi", {
      isAuthenticated: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("unauthenticated");
  });

  test("canAccessRoute returns correct boolean", () => {
    expect(canAccessRoute("logistics_dashboard", "CEO")).toBe(true);
    expect(canAccessRoute("logistics_dashboard", "DISPATCHER")).toBe(false);
    expect(canAccessRoute("my_day", "EMPLOYEE")).toBe(true);
  });

  test("getAccessibleRoutes filters by role", () => {
    const ceoRoutes = getAccessibleRoutes("CEO");
    const dispatcherRoutes = getAccessibleRoutes("DISPATCHER");
    expect(ceoRoutes.length).toBeGreaterThan(dispatcherRoutes.length);
  });

  test("getNavItemsForRole returns nav items", () => {
    const navItems = getNavItemsForRole("CEO");
    expect(navItems.every((r) => r.showInNav)).toBe(true);
  });

  test("isRouteRegistered checks registration", () => {
    expect(isRouteRegistered("/my-day")).toBe(true);
    expect(isRouteRegistered("/nonexistent-route")).toBe(false);
  });
});

describe("Access Control - Feature Flags", () => {
  afterEach(() => {
    clearFeatureFlagOverrides();
  });

  test("modules are enabled by default", () => {
    expect(isModuleEnabled("freight")).toBe(true);
    expect(isModuleEnabled("command_center")).toBe(true);
  });

  test("setFeatureFlag disables module", () => {
    setFeatureFlag("freight", false);
    expect(isModuleEnabled("freight")).toBe(false);
  });

  test("disabled module blocks access", () => {
    setFeatureFlag("freight", false);
    const result = checkPageAccess("/freight/loads", {
      role: "CEO" as UserRole,
      isAuthenticated: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("module_disabled");
  });

  test("clearFeatureFlagOverrides restores defaults", () => {
    setFeatureFlag("freight", false);
    expect(isModuleEnabled("freight")).toBe(false);
    clearFeatureFlagOverrides();
    expect(isModuleEnabled("freight")).toBe(true);
  });
});

describe("Access Control - Enforcement", () => {
  test("auditPageRoute identifies registered route", () => {
    const result = auditPageRoute("/my-day");
    expect(result.registered).toBe(true);
    expect(result.route?.id).toBe("my_day");
  });

  test("auditPageRoute identifies unregistered route", () => {
    const result = auditPageRoute("/unknown/page");
    expect(result.registered).toBe(false);
  });

  test("auditApiRoute identifies registered API route", () => {
    const result = auditApiRoute("/api/freight/kpi");
    expect(result.registered).toBe(true);
  });

  test("validateNewRoute rejects duplicate id", () => {
    const result = validateNewRoute({
      id: "my_day",
      path: "/new-path",
      module: "operations",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("already exists"))).toBe(true);
  });

  test("validateNewRoute rejects invalid module", () => {
    const result = validateNewRoute({
      id: "new_route",
      path: "/new-path",
      module: "invalid_module",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Module must be"))).toBe(true);
  });

  test("validateNewRoute accepts valid config", () => {
    const result = validateNewRoute({
      id: "brand_new_route",
      path: "/brand-new",
      module: "operations",
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

describe("Access Control - Role Coverage", () => {
  const STRATEGIC_ROLES: UserRole[] = ["CEO", "ADMIN", "COO", "VENTURE_HEAD"];
  const OPERATIONAL_ROLES: UserRole[] = ["DISPATCHER", "CSR", "CARRIER_TEAM", "EMPLOYEE"];

  test("strategic roles can access dashboards", () => {
    for (const role of STRATEGIC_ROLES) {
      expect(canAccessRoute("logistics_dashboard", role)).toBe(true);
    }
  });

  test("operational roles cannot access P&L", () => {
    for (const role of OPERATIONAL_ROLES) {
      expect(canAccessRoute("freight_pnl", role)).toBe(false);
    }
  });

  test("all roles can access my_day", () => {
    const allRoles: UserRole[] = [
      ...STRATEGIC_ROLES,
      ...OPERATIONAL_ROLES,
      "TEAM_LEAD",
      "FINANCE",
      "AUDITOR",
    ];
    for (const role of allRoles) {
      expect(canAccessRoute("my_day", role)).toBe(true);
    }
  });
});
