export default function AdminStudentsLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-[var(--rm-surface-raised)]" />
      <div className="h-4 w-64 rounded bg-[var(--rm-surface-raised)]" />
      <div className="mt-4 h-10 w-full max-w-md rounded-xl bg-[var(--rm-surface-raised)]" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)]"
          />
        ))}
      </div>
    </div>
  );
}
