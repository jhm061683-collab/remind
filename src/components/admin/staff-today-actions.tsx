"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StudentConsultingModal } from "@/components/admin/student-consulting-modal";
import type { AdminStudentRow } from "@/lib/types/admin";
import { studentListHref } from "@/lib/admin/student-list-query";
import { describeStaffing } from "@/lib/admin/staff-relation";
import { useClientClock } from "@/lib/react/client-display";
import {
  buildAttentionQueue,
  buildStaffGroups,
  summarizeStaffToday,
} from "@/lib/utils/staff-attention";

type Props = {
  isSubAdmin: boolean;
  students: AdminStudentRow[];
  scope?: string | null;
};

export function StaffTodayActions({ isSubAdmin, students, scope }: Props) {
  const [attentionOpen, setAttentionOpen] = useState(true);
  const [consulting, setConsulting] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const openedClock = useClientClock("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const groups = useMemo(() => buildStaffGroups(students), [students]);
  const summary = useMemo(() => summarizeStaffToday(students), [students]);
  const attention = useMemo(() => buildAttentionQueue(students), [students]);

  const listHref = (activity: string) =>
    studentListHref(
      { activity, scope: scope ?? null, page: 1 },
      {
        q: "",
        className: "all",
        grade: "all",
        teacher: "all",
        activity: "all",
        page: 1,
      },
    );

  return (
    <section data-tour-id="staff-today-actions" className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[var(--rm-text)]">
          오늘 조치가 필요한 학생
        </h2>
        <p className="text-xs text-[var(--rm-text-muted)]">
          {summary.completionPct != null
            ? `오늘 복습 진행 ${summary.completionPct}% · 학습한 학생 ${summary.reviewedToday}명`
            : isSubAdmin
              ? "담당 학생 중 확인이 필요한 사람부터 보세요"
              : "확인이 필요한 학생부터 보세요"}
          {openedClock ? ` · 이 화면을 연 시각 ${openedClock}` : ""}
        </p>
      </div>

      <div
        data-tour-id="staff-today-kpi"
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        {groups.map((group) => (
          <Link
            key={group.key}
            href={listHref(group.key)}
            className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3 text-left transition hover:border-[var(--rm-brand)]"
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
              대상 목록 보기
            </span>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--rm-text)]">
            바로 개입할 학생
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
            className="min-h-[44px] rounded-lg border border-[var(--rm-border)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--rm-text)]"
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
              {attention.map((item, index) => {
                const staffing = describeStaffing({
                  teacherNames: item.student.teacherNames,
                  subAdminName: item.student.subAdminName,
                });
                return (
                  <li
                    key={`${item.student.id}-${item.kind}`}
                    className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--rm-text)]">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-[var(--rm-text-muted)]">
                        {item.detail}
                        {staffing.primary ? ` · ${staffing.label}` : ""}
                      </p>
                    </div>
                    <div
                      className="flex shrink-0 flex-wrap gap-1"
                      data-tour-id={index === 0 ? "staff-quick-actions" : undefined}
                    >
                      <Link
                        href={`/admin/students/${item.student.id}`}
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--rm-border)] px-2.5 text-[11px] font-bold text-[var(--rm-text)]"
                      >
                        상세
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          setConsulting({
                            id: item.student.id,
                            name: item.student.displayName,
                          })
                        }
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--rm-border)] px-2.5 text-[11px] font-bold text-[var(--rm-text)]"
                      >
                        상담
                      </button>
                      <Link
                        href="/admin/notifications"
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--rm-border)] px-2.5 text-[11px] font-bold text-[var(--rm-text)]"
                      >
                        알림
                      </Link>
                      <Link
                        href="/admin/students?tab=reports"
                        className="inline-flex min-h-[44px] items-center rounded-lg border border-[var(--rm-border)] px-2.5 text-[11px] font-bold text-[var(--rm-text)]"
                      >
                        보고서
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : null}
      </div>

      {consulting ? (
        <StudentConsultingModal
          open
          studentId={consulting.id}
          studentName={consulting.name}
          onClose={() => setConsulting(null)}
        />
      ) : null}
    </section>
  );
}
