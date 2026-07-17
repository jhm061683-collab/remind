import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { isAdminOnlyPath } from "@/lib/constants/admin-nav";
import type { UserRole } from "@/types/user";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

function staffHome(role: UserRole): string {
  if (role === "admin" || role === "sub_admin") return "/admin/dashboard";
  return "/dashboard";
}

export async function requireStaff(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "sub_admin") {
    redirect(staffHome(session.role));
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (getEffectiveStaffRole(session) !== "admin") {
    redirect(staffHome(session.role));
  }
  return session;
}

/** 원장 전용 페이지 — 서브관리자는 대시보드로 */
export async function requireAdminPage(): Promise<SessionUser> {
  return requireAdmin();
}

export async function requireStaffAdminPath(pathname: string): Promise<SessionUser> {
  const session = await requireStaff();
  if (
    getEffectiveStaffRole(session) === "sub_admin" &&
    isAdminOnlyPath(pathname)
  ) {
    redirect("/admin/dashboard");
  }
  return session;
}
