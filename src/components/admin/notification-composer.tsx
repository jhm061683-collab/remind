"use client";

import { useMemo, useState, useTransition } from "react";
import { sendAdminNotificationAction } from "@/lib/actions/admin";
import type { AdminStudentRow } from "@/lib/types/admin";

type Props = {
  students: AdminStudentRow[];
};

export function NotificationComposer({ students }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.displayName, s.username, s.className ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="알림 제목"
          className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="학생 검색"
          className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="알림 내용"
        rows={4}
        className="w-full rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--rm-border)] p-2">
        <label className="mb-2 flex items-center gap-2 text-xs text-[var(--rm-text-muted)]">
          <input
            type="checkbox"
            checked={filtered.length > 0 && selected.length === filtered.length}
            onChange={(e) => setSelected(e.target.checked ? filtered.map((s) => s.id) : [])}
          />
          전체 선택
        </label>
        <div className="space-y-1">
          {filtered.map((student) => (
            <label key={student.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--rm-surface-raised)]">
              <input
                type="checkbox"
                checked={selected.includes(student.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, student.id]
                      : prev.filter((id) => id !== student.id),
                  )
                }
              />
              <span className="text-sm text-[var(--rm-text)]">
                {student.displayName} <span className="text-[var(--rm-text-faint)]">({student.username})</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <button
        type="button"
        disabled={pending || selected.length === 0}
        onClick={() =>
          startTransition(async () => {
            const res = await sendAdminNotificationAction(selected, title, body);
            setMessage(res.error ?? res.success ?? null);
          })
        }
        className="rounded-xl bg-[var(--rm-brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        선택 학생 일괄 알림 등록
      </button>
      {message ? <p className="text-xs text-[var(--rm-text-muted)] whitespace-pre-line">{message}</p> : null}
    </div>
  );
}
