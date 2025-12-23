import type { UserRole } from "@/lib/permissions";
import { ROUTE_REGISTRY, MODULE_LABELS, type ModuleId, type RouteConfig } from "@/lib/access-control/routes";

export type NavSectionId = ModuleId;

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
  section: NavSectionId;
  exact?: boolean;
  roles?: UserRole[];
};

function routeToNavItem(route: RouteConfig): NavItem {
  return {
    id: route.id,
    label: route.label || route.id,
    href: route.path,
    icon: route.icon,
    section: route.module as NavSectionId,
    exact: route.exact,
    roles: route.roles,
  };
}

export const NAV_ITEMS: NavItem[] = ROUTE_REGISTRY
  .filter((r) => r.showInNav === true)
  .map(routeToNavItem);

export const NAV_SECTIONS: { id: NavSectionId; label: string }[] = [
  { id: "command_center", label: MODULE_LABELS.command_center },
  { id: "operations", label: MODULE_LABELS.operations },
  { id: "it", label: MODULE_LABELS.it },
  { id: "freight", label: MODULE_LABELS.freight },
  { id: "hospitality", label: MODULE_LABELS.hospitality },
  { id: "bpo", label: MODULE_LABELS.bpo },
  { id: "saas", label: MODULE_LABELS.saas },
  { id: "holdings", label: MODULE_LABELS.holdings },
  { id: "admin", label: MODULE_LABELS.admin },
];

export function isNavItemVisible(item: NavItem, userRole: UserRole): boolean {
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(userRole);
}

export function getVisibleNavItems(userRole: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => isNavItemVisible(item, userRole));
}

export function getVisibleSections(
  userRole: UserRole
): { section: (typeof NAV_SECTIONS)[0]; items: NavItem[] }[] {
  const visibleItems = getVisibleNavItems(userRole);

  return NAV_SECTIONS.map((section) => ({
    section,
    items: visibleItems.filter((item) => item.section === section.id),
  })).filter((s) => s.items.length > 0);
}
