import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { getAuthenticatedStaffRole } from "@/lib/auth/staff-mode";
import { isAdminOnlyPath } from "@/lib/constants/admin-nav";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

function permissionDeniedUrl(need: "admin" | "staff", from?: string): string {
  const path =
    need === "staff" ? "/permission-denied" : "/admin/permission-denied";
  const params = new URLSearchParams({ need });
  if (from) params.set("from", from);
  return `${path}?${params.toString()}`;
}

export async function requireStaff(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "sub_admin") {
    redirect(permissionDeniedUrl("staff"));
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (getAuthenticatedStaffRole(session) !== "admin") {
    redirect(permissionDeniedUrl("admin", "/admin/dashboard"));
  }
  return session;
}

/** 원장 전용 페이지 — 선생님은 안내 화면으로 */
export async function requireAdminPage(): Promise<SessionUser> {
  return requireAdmin();
}

export async function requireStaffAdminPath(pathname: string): Promise<SessionUser> {
  const session = await requireStaff();
  if (
    getAuthenticatedStaffRole(session) === "sub_admin" &&
    isAdminOnlyPath(pathname)
  ) {
    redirect(permissionDeniedUrl("admin", "/admin/dashboard"));
  }
  return session;
}
