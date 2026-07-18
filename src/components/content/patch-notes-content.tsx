import { PATCH_NOTES } from "@/lib/content/patch-notes";

export function PatchNotesContent() {
  return (
    <div className="space-y-4">
      {PATCH_NOTES.map((note, index) => (
        <article
          key={note.version}
          className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm md:p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            {index === 0 ? (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                최신
              </span>
            ) : null}
            <time className="text-xs font-medium text-[var(--rm-text-muted)]">
              {note.date}
            </time>
          </div>
          <h2 className="mt-2 text-lg font-bold text-[var(--rm-text)]">
            {note.title}
          </h2>
          <p className="mt-1 text-sm text-[var(--rm-text-muted)]">
            {note.summary}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--rm-text)]">
            {note.changes.map((change) => (
              <li key={change} className="flex gap-2">
                <span className="mt-0.5 text-blue-600">✓</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
