import { ROUTE_REGISTRY, getRouteByPath, getRouteByApiPath } from "./routes";

export type RouteAuditResult = {
  path: string;
  registered: boolean;
  route?: { id: string; module: string };
};

export function auditPageRoute(path: string): RouteAuditResult {
  const route = getRouteByPath(path);
  return {
    path,
    registered: !!route,
    route: route ? { id: route.id, module: route.module } : undefined,
  };
}

export function auditApiRoute(apiPath: string): RouteAuditResult {
  const route = getRouteByApiPath(apiPath);
  return {
    path: apiPath,
    registered: !!route,
    route: route ? { id: route.id, module: route.module } : undefined,
  };
}

export function getUnregisteredPages(pagePaths: string[]): string[] {
  return pagePaths.filter((path) => !getRouteByPath(path));
}

export function getUnregisteredApiRoutes(apiPaths: string[]): string[] {
  return apiPaths.filter((path) => !getRouteByApiPath(path));
}

export function validateNewRoute(config: {
  id: string;
  path: string;
  module: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.id || config.id.trim() === "") {
    errors.push("Route must have an id");
  }
  
  if (!config.path || !config.path.startsWith("/")) {
    errors.push("Route path must start with /");
  }
  
  const existingById = ROUTE_REGISTRY.find((r) => r.id === config.id);
  if (existingById) {
    errors.push(`Route with id '${config.id}' already exists`);
  }
  
  const existingByPath = getRouteByPath(config.path);
  if (existingByPath && existingByPath.path === config.path) {
    errors.push(`Route with path '${config.path}' already exists (id: ${existingByPath.id})`);
  }
  
  const validModules = [
    "command_center",
    "operations",
    "it",
    "freight",
    "hospitality",
    "bpo",
    "saas",
    "holdings",
    "admin",
    "public",
  ];
  if (!validModules.includes(config.module)) {
    errors.push(`Module must be one of: ${validModules.join(", ")}`);
  }
  
  return { valid: errors.length === 0, errors };
}

export function generateRouteDocumentation(): string {
  const lines: string[] = [
    "# Route Registry Documentation",
    "",
    "## Change Protocol",
    "",
    "**All new routes MUST be registered in `lib/access-control/routes.ts`**",
    "",
    "1. Add the route config to ROUTE_REGISTRY",
    "2. Specify roles if access is restricted",
    "3. Assign to appropriate module",
    "4. Run tests to verify registration",
    "",
    "## Registered Routes",
    "",
  ];

  const byModule = new Map<string, typeof ROUTE_REGISTRY>();
  for (const route of ROUTE_REGISTRY) {
    if (!byModule.has(route.module)) {
      byModule.set(route.module, []);
    }
    byModule.get(route.module)!.push(route);
  }

  for (const [module, routes] of byModule) {
    lines.push(`### ${module.toUpperCase()}`);
    lines.push("");
    for (const route of routes) {
      const roles = route.roles?.join(", ") || "all authenticated users";
      lines.push(`- **${route.id}**: \`${route.path}\``);
      lines.push(`  - Roles: ${roles}`);
      if (route.apiPath) {
        lines.push(`  - API: \`${route.apiPath}\``);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
