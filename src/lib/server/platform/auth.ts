import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import type { UserRole } from "@/types/user";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

function homeForRole(role: UserRole): string {
  if (role === "platform_admin") return "/platform";
  if (role === "admin" || role === "sub_admin") return "/admin/dashboard";
  return "/dashboard";
}

/** 플랫폼(최종) 관리자 전용 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "platform_admin") {
    redirect(homeForRole(session.role));
  }
  return session;
}
