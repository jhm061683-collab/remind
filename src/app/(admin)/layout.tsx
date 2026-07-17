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
        ? "관리자 모드"
        : "선생님 모드"
      : canSwitch
        ? navRole === "admin"
          ? "팀장 · 관리자 모드"
          : "팀장 · 선생님 모드"
        : "서브관리자";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--rm-bg-base,#f4f7fb)]">
      <header className="rm-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <RemindLogo href="/admin/dashboard" size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session?.name ?? "관리자"}님
                <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {roleLabel}
                </span>
              </p>
              <p className="text-[11px] text-slate-500">Re:mind 학원 관리</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canSwitch ? <StaffModeSwitch currentMode={staffMode} /> : null}
            <Link
              href="/admin/account"
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
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
          <div className="sticky top-[3.25rem] z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="mb-2 flex justify-end">
              {canSwitch ? <StaffModeSwitch currentMode={staffMode} /> : null}
            </div>
            <AdminMobileNav role={navRole} />
          </div>
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
