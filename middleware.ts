import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import {
  getRouteByPath,
  getRouteByApiPath,
} from "@/lib/access-control/routes";
import { isModuleEnabled } from "@/lib/access-control/feature-flags";

type AccessResult = {
  allowed: boolean;
  reason?: "role_denied" | "module_disabled" | "unauthenticated";
};

function checkPageAccessSync(path: string, role?: string, isAuthenticated?: boolean): AccessResult {
  const route = getRouteByPath(path);
  
  if (!route) {
    return { allowed: true };
  }
  
  if (route.module === "public") {
    return { allowed: true };
  }
  
  if (!isModuleEnabled(route.module)) {
    return { allowed: false, reason: "module_disabled" };
  }
  
  if (!isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" };
  }
  
  if (!route.roles || route.roles.length === 0) {
    return { allowed: true };
  }
  
  if (!role || !route.roles.includes(role as any)) {
    return { allowed: false, reason: "role_denied" };
  }
  
  return { allowed: true };
}

function checkApiAccessSync(apiPath: string, role?: string, isAuthenticated?: boolean): AccessResult {
  if (apiPath.startsWith("/api/auth")) {
    return { allowed: true };
  }
  
  const route = getRouteByApiPath(apiPath);
  
  if (!route) {
    return { allowed: true };
  }
  
  if (route.module === "public") {
    return { allowed: true };
  }
  
  if (!isModuleEnabled(route.module)) {
    return { allowed: false, reason: "module_disabled" };
  }
  
  if (!isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" };
  }
  
  if (!route.roles || route.roles.length === 0) {
    return { allowed: true };
  }
  
  if (!role || !route.roles.includes(role as any)) {
    return { allowed: false, reason: "role_denied" };
  }
  
  return { allowed: true };
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production" 
      ? "__Secure-next-auth.session-token" 
      : "next-auth.session-token"
  });
  const url = req.nextUrl.pathname;

  if (url.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV === "development" && !token) {
    return NextResponse.next();
  }

  if (url.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const role = token.role as string | undefined;
    const accessResult = checkApiAccessSync(url, role, true);
    
    if (!accessResult.allowed) {
      if (accessResult.reason === "module_disabled") {
        return NextResponse.json(
          { error: "Feature not available" },
          { status: 404 }
        );
      }
      if (accessResult.reason === "role_denied") {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.next();
  }

  if (!token && !url.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    const role = token.role as string | undefined;
    const accessResult = checkPageAccessSync(url, role, true);
    
    if (!accessResult.allowed) {
      if (accessResult.reason === "module_disabled") {
        return NextResponse.redirect(new URL("/my-day", req.url));
      }
      if (accessResult.reason === "role_denied") {
        return NextResponse.redirect(new URL("/my-day", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/admin/:path*",
    "/ventures/:path*",
    "/offices/:path*",
    "/freight/:path*",
    "/logistics/:path*",
    "/hospitality/:path*",
    "/bpo/:path*",
    "/saas/:path*",
    "/holdings/:path*",
    "/import/:path*",
    "/mappings/:path*",
    "/bank/:path*",
    "/it/:path*",
    "/files/:path*",
    "/notifications/:path*",
    "/tasks/:path*",
    "/eod-reports/:path*",
    "/profile/:path*",
    "/hotel/:path*",
    "/hotels/:path*",
    "/policies/:path*",
    "/my-day",
    "/freight-kpis",
    "/gamification/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
