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
  /** 모바일 하단 탭용 짧은 라벨 */
  shortLabel?: string;
  adminOnly?: boolean;
  /** 사이드바/모바일 탭에 숨기고 계정 메뉴로만 진입 */
  menuOnly?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "대시보드", shortLabel: "홈" },
  { href: "/admin/students", label: "학생 관리", shortLabel: "학생" },
  { href: "/admin/classes", label: "반 관리", shortLabel: "반", adminOnly: true },
  {
    href: "/admin/sub-admins",
    label: "서브관리자",
    shortLabel: "서브",
    adminOnly: true,
  },
  { href: "/admin/notifications", label: "알림 발송", shortLabel: "알림" },
  // 계정 메뉴로만 진입
  {
    href: "/admin/suggestions",
    label: "건의사항",
    shortLabel: "건의",
    adminOnly: true,
    menuOnly: true,
  },
  {
    href: "/admin/account",
    label: "계정 설정",
    shortLabel: "계정",
    menuOnly: true,
  },
];

export function navItemsForRole(role: UserRole): AdminNavItem[] {
  const items =
    role === "admin"
      ? ADMIN_NAV_ITEMS
      : ADMIN_NAV_ITEMS.filter((item) => !item.adminOnly);
  return items.filter((item) => !item.menuOnly);
}
