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
      <header className="rm-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 md:hidden">
              <RemindLogo href="/admin/dashboard" size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session?.name ?? "관리자"}
              </p>
              {/* 모바일: 모드 스위치가 역할 표시 역할 → 배지 숨김 */}
              <p className="hidden items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
                Re:mind
                {!canSwitch ? (
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {roleLabel}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canSwitch ? <StaffModeSwitch currentMode={staffMode} /> : null}
            <Link
              href="/admin/account"
              className="hidden whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 md:inline-flex"
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
          <div className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-30 border-b border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
            <AdminMobileNav role={navRole} />
          </div>
          <main className="flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-5">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
