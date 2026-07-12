import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          compact
            ? "rounded-xl px-2 py-1.5 text-[11px] font-medium text-[var(--rm-text-muted)] transition hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
            : "rounded-xl px-3 py-2 text-xs font-medium text-[var(--rm-text-muted)] transition hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
        }
      >
        로그아웃
      </button>
    </form>
  );
}
