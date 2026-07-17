/** 선생님/원장 표시 이름 — 「원장」호칭은 admin 계정만 */
export function formatStaffLabel(opts: {
  displayName: string;
  nickname?: string | null;
  role?: string | null;
  isDirector?: boolean | null;
}): string {
  let base = (opts.nickname?.trim() || opts.displayName || "").trim();
  if (!base) return "—";

  // 「박원장」「박원장님」처럼 이미 붙은 호칭 제거 후 다시 맞춤
  base = base
    .replace(/원장님$/u, "")
    .replace(/원장$/u, "")
    .replace(/팀장$/u, "")
    .trim();
  if (!base) base = (opts.displayName || "").trim() || "원장";

  // admin(원장)만 「OOO원장」. 팀장(is_director)은 일반 이름 + UI 배지로 구분
  if (opts.role === "admin") return `${base}원장`;
  return base;
}
