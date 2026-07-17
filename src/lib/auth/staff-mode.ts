import type { SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@/types/user";

export type StaffMode = "admin" | "teacher";

/** 관리자 모드 전환 — 원장(admin) 또는 팀장(is_director) 선생님 */
export function canSwitchStaffMode(session: SessionUser): boolean {
  return session.role === "admin" || Boolean(session.isDirector);
}

export function resolveStaffMode(session: SessionUser): StaffMode {
  if (!canSwitchStaffMode(session)) {
    return session.role === "admin" ? "admin" : "teacher";
  }
  if (session.staffMode === "admin" || session.staffMode === "teacher") {
    return session.staffMode;
  }
  // 원장(admin): 기본 관리자 모드
  // 팀장 선생님: 기본 선생님 모드
  return session.role === "admin" ? "admin" : "teacher";
}

/** 실제 권한/데이터 범위에 쓰는 역할 */
export function getEffectiveStaffRole(
  session: SessionUser,
): "admin" | "sub_admin" {
  if (session.role !== "admin" && session.role !== "sub_admin") {
    return "sub_admin";
  }
  if (!canSwitchStaffMode(session)) {
    return session.role === "admin" ? "admin" : "sub_admin";
  }
  return resolveStaffMode(session) === "admin" ? "admin" : "sub_admin";
}

export function effectiveRoleForNav(session: SessionUser): UserRole {
  if (session.role === "student") return "student";
  return getEffectiveStaffRole(session);
}
