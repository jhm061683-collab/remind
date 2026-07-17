import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import {
  AdminMobileNav,
  AdminSidebar,
} from "@/components/layout/admin-sidebar";
import { StaffModeSwitch } from "@/components/layout/staff-mode-switch";
import { getSession } from "@/lib/auth/session";
import {
  canSwitchStaffMode,
  effectiveRoleForNav,
  resolveStaffMode,
} from "@/lib/auth/staff-mode";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const baseRole = session?.role ?? "admin";
  const navRole = session ? effectiveRoleForNav(session) : "admin";
  const canSwitch = session ? canSwitchStaffMode(session) : false;
  const staffMode = session ? resolveStaffMode(session) : "admin";

  const roleLabel =
    baseRole === "admin"
      ? navRole === "admin"
        ? "관리자"
        : "선생님"
      : canSwitch
        ? navRole === "admin"
          ? "팀장·관리"
          : "팀장"
        : "서브";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--rm-bg-base,#f4f7fb)]">
      <header className="rm-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="md:hidden">
              <RemindLogo href="/admin/dashboard" size="sm" />
            </div>
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-900">
                <span className="truncate">{session?.name ?? "관리자"}님</span>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {roleLabel}
                </span>
              </p>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Re:mind 학원 관리
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canSwitch ? <StaffModeSwitch currentMode={staffMode} /> : null}
            <Link
              href="/admin/account"
              className="hidden whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 sm:inline-flex"
            >
              계정
            </Link>
            <LogoutButton compact />
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <AdminSidebar role={navRole} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-[3.25rem] z-30 border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
            <AdminMobileNav role={navRole} />
          </div>
          <main className="flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
