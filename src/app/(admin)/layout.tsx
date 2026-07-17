import { LogoutButton } from "@/components/auth/logout-button";
import { RemindLogo } from "@/components/brand/remind-logo";
import {
  AdminMobileNav,
  AdminSidebar,
} from "@/components/layout/admin-sidebar";
import { getSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const role = session?.role ?? "admin";
  const roleLabel =
    role === "sub_admin" ? "서브관리자" : role === "admin" ? "관리자" : "";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--rm-bg-base,#f4f7fb)]">
      <header className="rm-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <RemindLogo href="/admin/dashboard" size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {session?.name ?? "관리자"}님
                {roleLabel ? (
                  <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {roleLabel}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-slate-500">Re:mind 학원 관리</p>
            </div>
          </div>
          <LogoutButton compact />
        </div>
      </header>
      <div className="flex flex-1">
        <AdminSidebar role={role} />
        <div className="flex flex-1 flex-col">
          <div className="border-b border-slate-200/80 bg-white px-4 py-3 md:hidden">
            <AdminMobileNav role={role} />
          </div>
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
