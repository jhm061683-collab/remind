import type { UserRole } from "@/types/user";

/** 원장(admin)만 접근 가능한 관리자 경로 */
export const ADMIN_ONLY_PATHS = [
  "/admin/sub-admins",
  "/admin/classes",
  "/admin/suggestions",
] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canAccessAdminArea(role: UserRole): boolean {
  return role === "admin" || role === "sub_admin";
}

export function canAccessAdminPath(role: UserRole, pathname: string): boolean {
  if (!canAccessAdminArea(role)) return false;
  if (role === "admin") return true;
  return !isAdminOnlyPath(pathname);
}

export type AdminNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/students", label: "학생 관리" },
  { href: "/admin/classes", label: "반 관리", adminOnly: true },
  { href: "/admin/sub-admins", label: "서브관리자", adminOnly: true },
  { href: "/admin/notifications", label: "알림 발송" },
  // 지금은 원장(admin)만. 추후 platform_admin 전용으로 이전 예정.
  { href: "/admin/suggestions", label: "건의사항", adminOnly: true },
  { href: "/admin/account", label: "계정 설정" },
];

export function navItemsForRole(role: UserRole): AdminNavItem[] {
  if (role === "admin") return ADMIN_NAV_ITEMS;
  return ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly);
}
