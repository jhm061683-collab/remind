import type { SessionUser } from "./session";
import { resolveViewScope, type StaffViewScope } from "./staff-mode";

/** 학원 전체/내 담당 scope가 학습·학생 운영 데이터에 적용되는 경로 */
const STUDENT_LEARNING_SCOPE_PREFIXES = [
  "/admin/dashboard",
  "/admin/students",
  "/admin/notifications",
] as const;

/** 조직·계정 관리 — scope와 무관하게 학원 전체 기준 */
const ORGANIZATION_SCOPE_PREFIXES = [
  "/admin/sub-admins",
  "/admin/classes",
  "/admin/billing",
  "/admin/account",
] as const;

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function isStudentLearningScopePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return STUDENT_LEARNING_SCOPE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isOrganizationScopePath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return ORGANIZATION_SCOPE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** 헤더 scope 토글 표시 여부 */
export function showsViewScopeSwitch(pathname: string): boolean {
  return isStudentLearningScopePath(pathname);
}

/**
 * 데이터 조회용 view scope.
 * 조직 관리 경로에서는 assigned를 academy로 정규화한다.
 */
export function resolveDataViewScope(
  session: SessionUser,
  urlScope?: string | null,
  pathname?: string | null,
): StaffViewScope {
  if (pathname && isOrganizationScopePath(pathname)) {
    return session.role === "admin" ? "academy" : "assigned";
  }
  return resolveViewScope(session, urlScope);
}

/**
 * 학생·대시보드 데이터 필터용 effective role.
 * 조직 관리 경로에서는 원장 admin 권한으로 전체 학원 데이터를 본다.
 */
export function getEffectiveStaffRoleForData(
  session: SessionUser,
  urlScope?: string | null,
  pathname?: string | null,
): "admin" | "sub_admin" {
  if (pathname && isOrganizationScopePath(pathname)) {
    if (session.role === "admin") return "admin";
    return "sub_admin";
  }
  const scope = resolveDataViewScope(session, urlScope, pathname);
  if (session.role !== "admin" && session.role !== "sub_admin") {
    return "sub_admin";
  }
  if (scope === "assigned") return "sub_admin";
  return session.role === "admin" ? "admin" : "sub_admin";
}
