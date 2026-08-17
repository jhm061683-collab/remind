import {
  bucketLabel,
  filterPatchNotes,
  PATCH_NOTES,
  type PatchBucket,
  type PatchChange,
  type PatchViewerRole,
} from "@/lib/content/patch-notes";

type Props = {
  role: PatchViewerRole;
};

function groupByBucket(changes: PatchChange[]): Array<{
  bucket: PatchBucket;
  items: PatchChange[];
}> {
  const order: PatchBucket[] = ["A", "B", "C"];
  return order
    .map((bucket) => ({
      bucket,
      items: changes.filter((c) => c.bucket === bucket),
    }))
    .filter((g) => g.items.length > 0);
}

export function PatchNotesContent({ role }: Props) {
  const notes = filterPatchNotes(PATCH_NOTES, role);
  const showSectionHeaders = role !== "student";

  if (notes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--rm-border)] px-4 py-8 text-center text-sm text-[var(--rm-text-muted)]">
        아직 표시할 패치노트가 없어요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note, index) => {
        const groups = groupByBucket(note.visibleChanges);
        return (
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

            <div className="mt-4 space-y-4">
              {groups.map((group) => (
                <div key={group.bucket}>
                  {showSectionHeaders ? (
                    <p className="mb-2 text-[11px] font-bold tracking-wide text-[var(--rm-text-muted)]">
                      {group.bucket === "A"
                        ? "학생 업데이트"
                        : group.bucket === "B"
                          ? "선생님 업데이트"
                          : "원장 업데이트"}
                      <span className="ml-1 font-medium text-[var(--rm-text-faint)]">
                        ({bucketLabel(group.bucket)})
                      </span>
                    </p>
                  ) : null}
                  <ul className="space-y-2 text-sm text-[var(--rm-text)]">
                    {group.items.map((change) => (
                      <li key={change.text} className="flex gap-2">
                        <span className="mt-0.5 text-blue-600">✓</span>
                        <span>{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
