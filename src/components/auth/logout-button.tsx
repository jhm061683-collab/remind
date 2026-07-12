import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-xl px-3 py-2 text-xs font-medium text-[var(--rm-text-muted)] transition hover:bg-[var(--rm-surface)] hover:text-[var(--rm-text)]"
      >
        로그아웃
      </button>
    </form>
  );
}
