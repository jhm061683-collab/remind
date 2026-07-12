import { LogoutButton } from "@/components/auth/logout-button";
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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-800">
            {session?.name ?? "관리자"}님
            {roleLabel ? (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {roleLabel}
              </span>
            ) : null}
          </p>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <AdminSidebar role={role} />
        <div className="flex flex-1 flex-col">
          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
            <AdminMobileNav role={role} />
          </div>
          <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
