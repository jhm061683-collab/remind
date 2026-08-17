"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminStudentRow } from "@/lib/types/admin";
import {
  buildAttentionQueue,
  buildStaffGroups,
  summarizeStaffToday,
  type StaffGroupKey,
} from "@/lib/utils/staff-attention";

type Props = {
  isSubAdmin: boolean;
  students: AdminStudentRow[];
};

export function StaffTodayActions({ isSubAdmin, students }: Props) {
  const [openGroup, setOpenGroup] = useState<StaffGroupKey | null>(null);
  const [attentionOpen, setAttentionOpen] = useState(true);

  const groups = useMemo(() => buildStaffGroups(students), [students]);
  const summary = useMemo(() => summarizeStaffToday(students), [students]);
  const attention = useMemo(() => buildAttentionQueue(students), [students]);

  const selected = groups.find((group) => group.key === openGroup) ?? null;

  return (
    <section data-tour-id="staff-today-actions" className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[var(--rm-text)]">
          {isSubAdmin ? "오늘 개입할 학생" : "학원 운영 상태"}
        </h2>
        <p className="text-xs text-[var(--rm-text-muted)]">
          {summary.completionPct != null
            ? `오늘 복습 진행 ${summary.completionPct}% · 학습한 학생 ${summary.reviewedToday}명`
            : isSubAdmin
              ? "담당 학생 중 확인이 필요한 사람부터 보세요"
              : "확인이 필요한 학생부터 보세요"}
          {" · "}
          이 화면을 연 시각 {new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {groups.map((group) => {
          const active = openGroup === group.key;
          return (
            <button
              key={group.key}
              type="button"
              aria-expanded={active}
              onClick={() => setOpenGroup(active ? null : group.key)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_8%,var(--rm-surface))]"
                  : "border-[var(--rm-border)] bg-[var(--rm-surface)] hover:border-[var(--rm-brand)]"
              }`}
            >
              <p className="text-[10px] font-semibold text-[var(--rm-text-muted)]">
                {group.label}
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--rm-text)]">
                {group.students.length}명
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[var(--rm-text-faint)]">
                {group.hint}
              </p>
              <span className="mt-2 inline-block text-xs font-bold text-[var(--rm-nav-active)]">
                {active ? "닫기" : "학생 보기"}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="rounded-xl border border-[var(--rm-brand)] bg-[var(--rm-surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[var(--rm-text)]">
              {selected.label} · {selected.students.length}명
            </h3>
            <button
              type="button"
              onClick={() => setOpenGroup(null)}
              className="text-[11px] font-semibold text-[var(--rm-text-muted)]"
            >
              닫기
            </button>
          </div>
          {selected.students.length === 0 ? (
            <p className="rounded-lg bg-[var(--rm-surface-raised)] px-3 py-4 text-center text-sm text-[var(--rm-text-muted)]">
              해당하는 학생이 없습니다
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-[var(--rm-border)] overflow-auto">
              {selected.students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--rm-text)]">
                      {student.displayName}
                      {student.className ? (
                        <span className="ml-1.5 text-xs font-normal text-[var(--rm-text-muted)]">
                          {student.className}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-[var(--rm-text-muted)]">
                      {selected.describe(student)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="shrink-0 rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--rm-text)]"
                  >
                    상세
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--rm-text)]">
            관리가 필요한 학생
            {attention.length > 0 ? (
              <span className="ml-1.5 text-xs font-semibold text-[var(--rm-text-muted)]">
                {attention.length}명
              </span>
            ) : null}
          </h3>
          <button
            type="button"
            aria-expanded={attentionOpen}
            onClick={() => setAttentionOpen((v) => !v)}
            className="rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--rm-text)]"
          >
            {attentionOpen ? "접기" : "펼치기"}
          </button>
        </div>

        {attentionOpen ? (
          attention.length === 0 ? (
            <p className="mt-2 rounded-lg bg-[var(--rm-surface-raised)] px-3 py-4 text-center text-sm text-[var(--rm-text-muted)]">
              지금 당장 챙길 이상 신호가 없습니다
            </p>
          ) : (
            <ul className="mt-1 divide-y divide-[var(--rm-border)]">
              {attention.map((item) => (
                <li
                  key={`${item.student.id}-${item.kind}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--rm-text)]">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-[var(--rm-text-muted)]">
                      {item.detail}
                      {item.student.teacherNames.length > 0
                        ? ` · ${item.student.teacherNames[0]}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--rm-text)]"
                  >
                    학생 보기
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}
