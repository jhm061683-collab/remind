"use client";

import { useMemo, useState, useTransition } from "react";
import { sendAdminNotificationAction } from "@/lib/actions/admin";
import type { AdminStudentRow } from "@/lib/types/admin";

type Props = {
  students: AdminStudentRow[];
};

export function NotificationComposer({ students }: Props) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const classNames = useMemo(() => {
    const names = new Set<string>();
    for (const student of students) {
      for (const name of student.classNames) names.add(name);
      if (student.className) names.add(student.className);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "ko"));
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (classFilter !== "all") {
        const inClass =
          s.classNames.includes(classFilter) || s.className === classFilter;
        if (!inClass) return false;
      }
      if (!q) return true;
      return [s.displayName, s.username, s.className ?? "", ...s.classNames, ...s.teacherNames]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [students, query, classFilter]);

  const selectedStudents = students.filter((s) => selected.includes(s.id));

  function toggleVisible(checked: boolean) {
    const visibleIds = filtered.map((s) => s.id);
    if (checked) {
      setSelected((prev) => [...new Set([...prev, ...visibleIds])]);
      return;
    }
    const hide = new Set(visibleIds);
    setSelected((prev) => prev.filter((id) => !hide.has(id)));
  }

  const visibleSelected =
    filtered.length > 0 && filtered.every((s) => selected.includes(s.id));

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-[var(--rm-text)]">발송 전 확인</p>
          <p className="text-sm text-[var(--rm-text)]">대상 {selectedStudents.length}명</p>
          <p className="max-h-24 overflow-auto text-xs text-[var(--rm-text-muted)]">
            {selectedStudents.slice(0, 12).map((s) => s.displayName).join(", ")}
            {selectedStudents.length > 12
              ? ` 외 ${selectedStudents.length - 12}명`
              : ""}
          </p>
          <p className="text-sm font-semibold text-[var(--rm-text)]">{title}</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--rm-text-muted)]">{body}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="min-h-[44px] flex-1 rounded-xl border border-[var(--rm-border)] text-sm font-semibold"
            >
              뒤로
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await sendAdminNotificationAction(selected, title, body);
                  setMessage(res.error ?? res.success ?? null);
                  setConfirming(false);
                })
              }
              className="min-h-[44px] flex-1 rounded-xl rm-fill-brand text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "등록 중..." : "확인 후 등록"}
            </button>
          </div>
        </div>
      ) : (
        <>
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
              placeholder="학생·반·담당 검색"
              className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
            />
          </div>
          {classNames.length > 0 ? (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
            >
              <option value="all">전체 반</option>
              {classNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="알림 내용"
            rows={4}
            className="w-full rounded-xl border border-[var(--rm-border)] px-3 py-2 text-sm"
          />
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--rm-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--rm-text)]">
            <span>선택 {selected.length}명 · 지금 목록 {filtered.length}명</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => toggleVisible(true)}>
                현재 목록 선택
              </button>
              <button type="button" onClick={() => setSelected([])}>
                선택 해제
              </button>
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--rm-border)] p-2">
            <label className="mb-2 flex items-center gap-2 text-xs text-[var(--rm-text-muted)]">
              <input
                type="checkbox"
                checked={visibleSelected}
                onChange={(e) => toggleVisible(e.target.checked)}
              />
              현재 필터 결과 선택
            </label>
            <div className="space-y-1">
              {filtered.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--rm-surface-raised)]"
                >
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
                    {student.displayName}{" "}
                    <span className="text-[var(--rm-text-faint)]">
                      ({student.username}
                      {student.className ? ` · ${student.className}` : ""})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={pending || selected.length === 0 || !title.trim() || !body.trim()}
            onClick={() => setConfirming(true)}
            className="min-h-[44px] rounded-xl rm-fill-brand px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            대상 확인 후 등록
          </button>
        </>
      )}
      {message ? (
        <p className="whitespace-pre-line text-xs text-[var(--rm-text-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
