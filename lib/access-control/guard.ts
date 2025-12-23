import type { UserRole } from "@/lib/permissions";
import { ROUTE_REGISTRY, getRouteByPath, getRouteByApiPath, type RouteConfig, type ModuleId } from "./routes";
import { isModuleEnabled } from "./feature-flags";

export type AccessCheckResult = {
  allowed: boolean;
  reason?: "not_found" | "role_denied" | "module_disabled" | "unauthenticated";
  route?: RouteConfig;
};

export type AccessContext = {
  role?: UserRole | null;
  isAuthenticated?: boolean;
};

export function checkPageAccess(path: string, ctx: AccessContext): AccessCheckResult {
  const route = getRouteByPath(path);
  
  if (!route) {
    return { allowed: true, reason: undefined };
  }
  
  if (route.module === "public") {
    return { allowed: true, route };
  }
  
  if (!isModuleEnabled(route.module)) {
    return { allowed: false, reason: "module_disabled", route };
  }
  
  if (!ctx.isAuthenticated && ctx.role === undefined) {
    return { allowed: false, reason: "unauthenticated", route };
  }
  
  if (!route.roles || route.roles.length === 0) {
    return { allowed: true, route };
  }
  
  const userRole = ctx.role || "EMPLOYEE";
  if (!route.roles.includes(userRole)) {
    return { allowed: false, reason: "role_denied", route };
  }
  
  return { allowed: true, route };
}

export function checkApiAccess(apiPath: string, ctx: AccessContext): AccessCheckResult {
  if (apiPath.startsWith("/api/auth")) {
    return { allowed: true };
  }
  
  const route = getRouteByApiPath(apiPath);
  
  if (!route) {
    return { allowed: true };
  }
  
  if (route.module === "public") {
    return { allowed: true, route };
  }
  
  if (!isModuleEnabled(route.module)) {
    return { allowed: false, reason: "module_disabled", route };
  }
  
  if (!ctx.isAuthenticated) {
    return { allowed: false, reason: "unauthenticated", route };
  }
  
  if (!route.roles || route.roles.length === 0) {
    return { allowed: true, route };
  }
  
  const userRole = ctx.role || "EMPLOYEE";
  if (!route.roles.includes(userRole)) {
    return { allowed: false, reason: "role_denied", route };
  }
  
  return { allowed: true, route };
}

export function canAccessRoute(routeId: string, role: UserRole): boolean {
  const route = ROUTE_REGISTRY.find((r) => r.id === routeId);
  if (!route) return false;
  
  if (!isModuleEnabled(route.module)) return false;
  
  if (!route.roles || route.roles.length === 0) return true;
  
  return route.roles.includes(role);
}

export function getAccessibleRoutes(role: UserRole): RouteConfig[] {
  return ROUTE_REGISTRY.filter((route) => {
    if (!isModuleEnabled(route.module)) return false;
    if (!route.roles || route.roles.length === 0) return true;
    return route.roles.includes(role);
  });
}

export function getNavItemsForRole(role: UserRole): RouteConfig[] {
  return getAccessibleRoutes(role).filter((r) => r.showInNav === true);
}

export function getModulesForRole(role: UserRole): ModuleId[] {
  const routes = getAccessibleRoutes(role);
  const modules = new Set<ModuleId>();
  for (const route of routes) {
    if (route.module !== "public") {
      modules.add(route.module);
    }
  }
  return Array.from(modules);
}

export function isRouteRegistered(path: string): boolean {
  return getRouteByPath(path) !== undefined;
}

export function isApiRouteRegistered(apiPath: string): boolean {
  return getRouteByApiPath(apiPath) !== undefined;
}

export function getAllRegisteredPaths(): string[] {
  return ROUTE_REGISTRY.map((r) => r.path);
}

export function getAllRegisteredApiPaths(): string[] {
  return ROUTE_REGISTRY.filter((r) => r.apiPath).map((r) => r.apiPath!);
}
