/** 플랫폼 페이지 이동 시 즉시 표시되는 스켈레톤 */
export default function PlatformLoading() {
  return (
    <div className="animate-pulse space-y-3 pt-1" aria-label="불러오는 중">
      <div className="h-6 w-48 rounded-lg bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-40 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-40 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
    </div>
  );
}
