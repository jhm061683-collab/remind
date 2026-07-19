import { logoutAction } from "@/lib/auth/actions";
import { RemindLogo } from "@/components/brand/remind-logo";
import { getSession } from "@/lib/auth/session";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-dvh bg-[var(--rm-bg)] text-[var(--rm-text)]">
      <header className="border-b border-[var(--rm-border)] bg-[var(--rm-surface)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <RemindLogo href="/platform" size="sm" />
            <div>
              <p className="text-sm font-semibold">커맨드센터</p>
              <p className="text-xs text-[var(--rm-text-muted)]">
                학원 · 구독 관리
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--rm-text-muted)]">
              {session?.name ?? "플랫폼"}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-[var(--rm-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--rm-surface-raised)]"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-4">{children}</main>
    </div>
  );
}
