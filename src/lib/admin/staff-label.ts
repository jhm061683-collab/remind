/** 선생님/원장 표시 이름 */
export function formatStaffLabel(opts: {
  displayName: string;
  nickname?: string | null;
  role?: string | null;
  isDirector?: boolean | null;
}): string {
  const base = (opts.nickname?.trim() || opts.displayName || "").trim();
  if (!base) return "—";
  const isDirector = opts.role === "admin" || Boolean(opts.isDirector);
  if (!isDirector) return base;
  if (base.endsWith("원장")) return base;
  return `${base}원장`;
}
