import { AdminAccountMenu } from "@/components/layout/admin-account-menu";
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
import { canViewSuggestions } from "@/lib/constants/suggestions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const navRole = session ? effectiveRoleForNav(session) : "admin";
  const canSwitch = session ? canSwitchStaffMode(session) : false;
  const staffMode = session ? resolveStaffMode(session) : "admin";
  const showSuggestions = canViewSuggestions(session?.role);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--rm-bg-base,#f4f7fb)]">
      <header className="rm-header sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="min-w-0 shrink-0">
            <RemindLogo href="/admin/dashboard" size="sm" />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {canSwitch ? <StaffModeSwitch currentMode={staffMode} /> : null}
            <AdminAccountMenu
              userName={session?.name ?? "관리자"}
              showSuggestions={showSuggestions}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <AdminSidebar role={navRole} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-30 border-b border-slate-200/70 bg-white/90 px-3 py-2 backdrop-blur-md md:hidden">
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
