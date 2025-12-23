import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import useSWR from "swr";
import { useTestMode } from "@/contexts/TestModeContext";
import ImpersonateDropdown from "@/components/ImpersonateDropdown";
import NotificationsBell from "@/components/NotificationsBell";
import Footer from "@/components/Footer";
import { useEffectiveUser, Role } from "@/hooks/useEffectiveUser";
import { canAccessAdminPanel, canManageUsers } from "@/lib/permissions";
import { NAV_SECTIONS, getVisibleNavItems, NavItem, NavSectionId } from "@/lib/nav";
import type { UserRole } from "@/lib/permissions";
import { APP_NAME } from "@/lib/appMeta";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

const sectionsFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sections");
  const data = await res.json();
  return data.accessibleSections || [];
};

const NAV_COLLAPSED_KEY = "siox_nav_collapsed";
const MOBILE_NAV_OPEN_KEY = "siox_mobile_nav_open";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const { testMode, setTestMode, isSeeding } = useTestMode();
  const { effectiveUser, realUser, loading } = useEffectiveUser();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const { data: accessibleSections = [], isLoading: sectionsLoading } = useSWR<string[]>(
    effectiveUser?.id ? "/api/user/venture-types" : null,
    sectionsFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60000 }
  );
  const [collapsedSections, setCollapsedSections] = useState<Set<NavSectionId>>(new Set());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  useIdleTimeout();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAV_COLLAPSED_KEY);
      if (stored) {
        setCollapsedSections(new Set(JSON.parse(stored)));
      }
    } catch {}
  }, []);

  const toggleSection = useCallback((sectionId: NavSectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      try {
        localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    const allSectionIds = NAV_SECTIONS.map((s) => s.id);
    setCollapsedSections(new Set(allSectionIds));
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify(allSectionIds));
    } catch {}
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedSections(new Set());
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, JSON.stringify([]));
    } catch {}
  }, []);

  const role = (effectiveUser?.role || "EMPLOYEE") as Role;
  const showAdminGroup = !loading && canAccessAdminPanel(role);
  const showUsersAdmin = !loading && canManageUsers(role);

  const visibleItems = getVisibleNavItems(role as UserRole);


  const isActive = (item: NavItem) => {
    if (item.exact) return router.pathname === item.href;
    return router.pathname === item.href || router.pathname.startsWith(item.href + "/");
  };

  const linkClass = (item: NavItem) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition ${
      isActive(item)
        ? "bg-gray-800 text-white"
        : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
    }`;

  const displayName = effectiveUser?.name || effectiveUser?.email || "User";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const isImpersonating = realUser && effectiveUser && realUser.id !== effectiveUser.id;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setAvatarMenuOpen(false);
    await signOut({ callbackUrl: "/login" });
  };

  const handleExitImpersonation = async () => {
    setAvatarMenuOpen(false);
    try {
      await fetch("/api/impersonation/stop", { method: "POST" });
      window.location.reload();
    } catch (e) {
      console.error("Failed to exit impersonation", e);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {mobileNavOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-slate-800 dark:bg-gray-900 text-gray-100 flex flex-col transform transition-transform duration-200 ease-in-out ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-xs font-bold text-slate-950">
              SX
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">{APP_NAME}</span>
              <span className="text-[11px] text-gray-400">Multi-Venture Oversight</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
            aria-label="Close navigation menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-sm" data-testid="sidebar-nav">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[10px] text-gray-500">Navigation</span>
            <div className="flex gap-1">
              <button
                onClick={expandAll}
                className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                title="Expand all sections"
              >
                +
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] text-gray-500 hover:text-gray-300 px-1"
                title="Collapse all sections"
              >
                −
              </button>
            </div>
          </div>
          {NAV_SECTIONS.map((section) => {
            if (!sectionsLoading && accessibleSections.length > 0 && !accessibleSections.includes(section.id)) {
              return null;
            }

            const sectionItems = visibleItems.filter((i) => i.section === section.id);
            if (sectionItems.length === 0) return null;

            const isCollapsed = collapsedSections.has(section.id);
            const hasActiveItem = sectionItems.some((item) => isActive(item));

            return (
              <div key={section.id} className="mb-2">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] uppercase tracking-wide transition ${
                    hasActiveItem && isCollapsed
                      ? "text-emerald-400 bg-gray-800/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
                  }`}
                >
                  <span>{section.label}</span>
                  <svg
                    className={`h-3 w-3 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <ul
                  className={`space-y-0.5 mt-1 overflow-hidden transition-all duration-200 ${
                    isCollapsed ? "max-h-0 opacity-0" : "max-h-[1000px] opacity-100"
                  }`}
                >
                  {sectionItems.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className={linkClass(item)}>
                        {item.icon && <span>{item.icon}</span>}
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="px-3 pt-3 pb-2 border-t border-gray-800 space-y-2">
          <button
            onClick={() => setTestMode(!testMode)}
            disabled={isSeeding}
            className={`w-full px-3 py-2 rounded-md text-sm font-medium transition ${
              testMode
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            } ${isSeeding ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSeeding ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Preparing Test Data...
              </span>
            ) : (
              `Test Mode: ${testMode ? "ON" : "OFF"}`
            )}
          </button>

          {testMode && showUsersAdmin && (
            <button
              onClick={async () => {
                if (!confirm("Create additional test users for all roles?")) return;
                const res = await fetch("/api/admin/seed-test-users", { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  alert(data.message);
                  window.location.reload();
                } else {
                  alert("Failed to seed test users");
                }
              }}
              className="w-full px-3 py-2 rounded-md text-sm font-medium border border-green-500 text-green-400 hover:bg-green-500/10 transition"
            >
              + More Test Users
            </button>
          )}

          {testMode && showAdminGroup && (
            <button
              onClick={async () => {
                if (!confirm("Delete ALL test data (tasks, policies, offices, ventures)?")) return;
                const res = await fetch("/api/admin/clear-test-data", { method: "DELETE" });
                if (res.ok) {
                  const data = await res.json();
                  alert(`Deleted: ${data.deleted.tasks} tasks, ${data.deleted.policies} policies, ${data.deleted.offices} offices, ${data.deleted.ventures} ventures`);
                  window.location.reload();
                } else {
                  alert("Failed to clear test data");
                }
              }}
              className="w-full px-3 py-2 rounded-md text-sm font-medium border border-red-500 text-red-400 hover:bg-red-500/10 transition"
            >
              Clear Test Data
            </button>
          )}
        </div>

        <div className="px-3 pt-2 pb-2 border-t border-gray-800">
          <ImpersonateDropdown />
        </div>

        <div className="px-3 pt-2 pb-3 border-t border-gray-800">
          <Link
            href="/feedback"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800/60 hover:text-white transition"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Report Issue / Feedback
          </Link>
        </div>

      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              aria-label="Open navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Page</span>
            <span className="text-base font-semibold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">{title || "Dashboard"}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NotificationsBell />
            <span 
              className="hidden md:inline text-gray-500 cursor-help"
              title="Owner Timeline is coming soon. Live activity feed will appear here."
            >
              Owner Timeline live
            </span>

            <div className="relative" ref={avatarMenuRef}>
              <button
                type="button"
                onClick={() => setAvatarMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1 transition"
              >
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                    {userInitials}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {role}
                    {isImpersonating && (
                      <span className="ml-1 text-amber-600">(impersonating)</span>
                    )}
                  </span>
                </div>
                <svg
                  className="h-3 w-3 text-gray-500 dark:text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {avatarMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg text-xs z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {role}
                    </div>
                    {isImpersonating && realUser && (
                      <div className="mt-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
                        Impersonating as {effectiveUser?.name}
                        <div className="text-amber-600">Real user: {realUser.name}</div>
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    {isImpersonating && (
                      <button
                        type="button"
                        onClick={handleExitImpersonation}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-amber-700 flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                        </svg>
                        Exit Impersonation
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}
