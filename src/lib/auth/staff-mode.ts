import type { SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@/types/user";

export type StaffMode = "admin" | "teacher";
export type StaffViewScope = "academy" | "assigned";

/** 실제 로그인 역할. 화면 버튼으로 바꾸지 않는다. */
export function getAuthenticatedStaffRole(
  session: SessionUser,
): "admin" | "sub_admin" {
  return session.role === "admin" ? "admin" : "sub_admin";
}

/** 원장만 학원 전체 / 내 담당을 전환할 수 있다. 팀장 선생님은 권한을 올리지 못한다. */
export function canSwitchViewScope(session: SessionUser): boolean {
  return session.role === "admin";
}

/** @deprecated 보기 범위 전환만 허용. 권한 상승에 쓰지 말 것. */
export function canSwitchStaffMode(session: SessionUser): boolean {
  return canSwitchViewScope(session);
}

export function parseViewScope(raw: unknown): StaffViewScope | null {
  if (raw === "academy" || raw === "assigned") return raw;
  return null;
}

function viewScopeFromLegacyMode(mode: unknown): StaffViewScope | null {
  if (mode === "admin") return "academy";
  if (mode === "teacher") return "assigned";
  return null;
}

export function resolveViewScope(
  session: SessionUser,
  urlScope?: string | null,
): StaffViewScope {
  const fromUrl = parseViewScope(urlScope);
  if (fromUrl) {
    if (!canSwitchViewScope(session)) {
      return session.role === "admin" ? "academy" : "assigned";
    }
    return fromUrl;
  }
  if (!canSwitchViewScope(session)) {
    return session.role === "admin" ? "academy" : "assigned";
  }
  const stored = parseViewScope(session.viewScope);
  if (stored) return stored;
  const fromMode = viewScopeFromLegacyMode(session.staffMode);
  if (fromMode) return fromMode;
  return "academy";
}

export function viewScopeToStaffMode(scope: StaffViewScope): StaffMode {
  return scope === "academy" ? "admin" : "teacher";
}

export function resolveStaffMode(session: SessionUser): StaffMode {
  return viewScopeToStaffMode(resolveViewScope(session));
}

export function usesAssignedView(
  session: SessionUser,
  urlScope?: string | null,
): boolean {
  return resolveViewScope(session, urlScope) === "assigned";
}

/**
 * 데이터 보기 범위용. 경로 권한 검사에 쓰지 않는다.
 * 원장이 내 담당이면 담당 학생만 조회한다.
 */
export function getEffectiveStaffRole(
  session: SessionUser,
  urlScope?: string | null,
): "admin" | "sub_admin" {
  if (session.role !== "admin" && session.role !== "sub_admin") {
    return "sub_admin";
  }
  if (usesAssignedView(session, urlScope)) return "sub_admin";
  return session.role === "admin" ? "admin" : "sub_admin";
}

export function effectiveRoleForNav(session: SessionUser): UserRole {
  if (session.role === "student") return "student";
  return getAuthenticatedStaffRole(session);
}

export function staffRoleLabel(role: UserRole): string {
  if (role === "admin") return "원장";
  if (role === "sub_admin") return "선생님";
  if (role === "platform_admin") return "플랫폼 관리자";
  return "학생";
}
