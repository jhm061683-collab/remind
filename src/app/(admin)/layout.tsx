import { Suspense } from "react";
import { AdminAccountMenuKeyed } from "@/components/layout/admin-account-menu";
import { RemindLogo } from "@/components/brand/remind-logo";
import {
  AdminMobileNav,
  AdminSidebar,
} from "@/components/layout/admin-sidebar";
import { StaffModeSwitchGate } from "@/components/layout/staff-mode-switch-gate";
import {
  AdminThemeProvider,
  AdminThemeToggle,
} from "@/components/theme/admin-theme-provider";
import { TutorialProvider } from "@/components/tutorial/tutorial-provider";
import { getSession } from "@/lib/auth/session";
import {
  canSwitchViewScope,
  getAuthenticatedStaffRole,
  resolveViewScope,
} from "@/lib/auth/staff-mode";
import { canViewSuggestions } from "@/lib/constants/suggestions";
import { listTutorialPreferences } from "@/lib/server/tutorial/preferences";
import { isSupabaseUserId } from "@/lib/supabase/config";
import {
  ADMIN_THEME_COOKIE,
  parseAdminThemeCookie,
} from "@/lib/theme/admin-theme";
import { DEFAULT_STUDENT_THEME } from "@/lib/theme/student-theme";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const navRole = session ? getAuthenticatedStaffRole(session) : "admin";
  const canSwitch = session ? canSwitchViewScope(session) : false;
  const viewScope = session ? resolveViewScope(session) : "academy";
  const showSuggestions = canViewSuggestions(session?.role);
  const userId = session?.id ?? "guest";
  const cookieStore = await cookies();
  const initialTheme =
    parseAdminThemeCookie(cookieStore.get(ADMIN_THEME_COOKIE)?.value) ??
    DEFAULT_STUDENT_THEME;
  const tutorialPrefs =
    session?.id && isSupabaseUserId(session.id)
      ? await listTutorialPreferences(session.id)
      : [];
  const tourRole =
    navRole === "admin" || navRole === "sub_admin" ? navRole : null;

  return (
    <AdminThemeProvider userId={userId} initialTheme={initialTheme}>
      <TutorialProvider
        userId={userId}
        role={tourRole}
        initialPrefs={tutorialPrefs}
      >
      <div className="relative z-[1] flex min-h-full flex-1 flex-col bg-[var(--rm-bg-base)]">
        <header className="rm-header sticky top-0 z-40 border-b border-[var(--rm-border)] bg-[color-mix(in_srgb,var(--rm-surface)_82%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            <div className="min-w-0">
              <RemindLogo href="/admin/dashboard" size="sm" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {canSwitch ? (
                <Suspense fallback={null}>
                  <StaffModeSwitchGate currentScope={viewScope} />
                </Suspense>
              ) : null}
              <AdminThemeToggle />
              <AdminAccountMenuKeyed
                userName={session?.name ?? "관리자"}
                showSuggestions={showSuggestions}
              />
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <AdminSidebar role={navRole} />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 min-w-0 px-3 py-2.5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-3 md:px-4 md:py-3 lg:pb-4">
              <div className="mx-auto w-full max-w-4xl">{children}</div>
            </main>
          </div>
        </div>

        <AdminMobileNav role={navRole} />
      </div>
      </TutorialProvider>
    </AdminThemeProvider>
  );
}
