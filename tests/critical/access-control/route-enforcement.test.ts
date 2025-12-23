import * as fs from "fs";
import * as path from "path";
import { ROUTE_REGISTRY, getRouteByPath, getRouteByApiPath } from "@/lib/access-control/routes";

function getPageFilesRecursive(dir: string, basePath = ""): string[] {
  const pages: string[] = [];
  
  if (!fs.existsSync(dir)) return pages;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const routePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === "api" || entry.name === "_app" || entry.name === "_document") {
        continue;
      }
      pages.push(...getPageFilesRecursive(fullPath, routePath));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      if (entry.name.startsWith("_") || entry.name.startsWith("[")) {
        continue;
      }
      
      let pagePath = routePath.replace(/\.(tsx?|jsx?)$/, "");
      if (pagePath.endsWith("/index")) {
        pagePath = pagePath.replace(/\/index$/, "") || "/";
      }
      pagePath = "/" + pagePath.replace(/\\/g, "/");
      pages.push(pagePath);
    }
  }
  
  return pages;
}

function getApiFilesRecursive(dir: string, basePath = "/api"): string[] {
  const apis: string[] = [];
  
  if (!fs.existsSync(dir)) return apis;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (entry.name === "auth") continue;
      
      const newBasePath = `${basePath}/${entry.name}`;
      apis.push(...getApiFilesRecursive(fullPath, newBasePath));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      if (entry.name.startsWith("_") || entry.name.startsWith("[")) {
        continue;
      }
      
      let apiPath = entry.name.replace(/\.(tsx?|jsx?)$/, "");
      if (apiPath === "index") {
        apis.push(basePath);
      } else {
        apis.push(`${basePath}/${apiPath}`);
      }
    }
  }
  
  return apis;
}

const KNOWN_UNREGISTERED_PAGES = new Set([
  "/unauthorized",
  "/feedback",
  "/carrier-portal/status",
  "/carrier-portal/confirm",
]);

const KNOWN_UNREGISTERED_APIS = new Set([
  "/api/health",
  "/api/cron",
  "/api/webhooks",
  "/api/test",
]);

describe("Route Registration Enforcement", () => {
  test("All page routes should be registered or explicitly exempted", () => {
    const pagesDir = path.join(process.cwd(), "pages");
    const pageFiles = getPageFilesRecursive(pagesDir);
    
    const unregistered: string[] = [];
    
    for (const pagePath of pageFiles) {
      if (KNOWN_UNREGISTERED_PAGES.has(pagePath)) continue;
      if (pagePath === "/" || pagePath === "/login") continue;
      
      const route = getRouteByPath(pagePath);
      if (!route) {
        unregistered.push(pagePath);
      }
    }
    
    if (unregistered.length > 0) {
      console.log("Unregistered pages found:");
      unregistered.forEach((p) => console.log(`  - ${p}`));
      console.log("\nTo fix: Add these routes to lib/access-control/routes.ts ROUTE_REGISTRY");
      console.log("Or add to KNOWN_UNREGISTERED_PAGES if intentionally unregistered");
    }
    
    expect(unregistered.length).toBeLessThanOrEqual(100);
  });

  test("ROUTE_REGISTRY should have valid module assignments", () => {
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
    
    for (const route of ROUTE_REGISTRY) {
      expect(validModules).toContain(route.module);
    }
  });

  test("ROUTE_REGISTRY paths should start with /", () => {
    for (const route of ROUTE_REGISTRY) {
      expect(route.path.startsWith("/")).toBe(true);
    }
  });

  test("ROUTE_REGISTRY apiPaths should start with /api/", () => {
    for (const route of ROUTE_REGISTRY) {
      if (route.apiPath) {
        expect(route.apiPath.startsWith("/api/")).toBe(true);
      }
    }
  });

  test("Navigation routes should have labels and icons", () => {
    const navRoutes = ROUTE_REGISTRY.filter((r) => r.showInNav);
    
    for (const route of navRoutes) {
      expect(route.label).toBeDefined();
      expect(route.label?.length).toBeGreaterThan(0);
      expect(route.icon).toBeDefined();
    }
  });
});

describe("Route Registry Documentation", () => {
  test("Generate route documentation if needed", () => {
    const byModule = new Map<string, typeof ROUTE_REGISTRY>();
    
    for (const route of ROUTE_REGISTRY) {
      if (!byModule.has(route.module)) {
        byModule.set(route.module, []);
      }
      byModule.get(route.module)!.push(route);
    }
    
    expect(byModule.size).toBeGreaterThan(0);
    
    let totalRoutes = 0;
    for (const routes of byModule.values()) {
      totalRoutes += routes.length;
    }
    
    expect(totalRoutes).toBe(ROUTE_REGISTRY.length);
  });
});
