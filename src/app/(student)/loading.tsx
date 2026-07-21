/** 탭 이동 시 서버 응답을 기다리는 동안 즉시 표시되는 스켈레톤 */
export default function StudentLoading() {
  return (
    <div className="animate-pulse space-y-3 pt-1" aria-label="불러오는 중">
      <div className="h-6 w-40 rounded-lg bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-32 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-32 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
      <div className="h-20 rounded-2xl bg-[var(--rm-surface,#e2e8f0)]" />
    </div>
  );
}
