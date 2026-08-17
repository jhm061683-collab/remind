import type { AdminStudentRow } from "@/lib/types/admin";

export type AttentionKind =
  | "inactive_7"
  | "due_backlog"
  | "no_review_today"
  | "never_login"
  | "high_due";

export type AttentionItem = {
  student: AdminStudentRow;
  kind: AttentionKind;
  title: string;
  detail: string;
  href: string;
};

/** 관리 행동이 필요한 학생을 우선순위 순으로 뽑는다 */
export function buildAttentionQueue(
  students: AdminStudentRow[],
  limit = 8,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const student of students) {
    const href = `/admin/students/${student.id}`;

    if (!student.lastLoginAt) {
      items.push({
        student,
        kind: "never_login",
        title: student.displayName,
        detail: "아직 한 번도 로그인하지 않음",
        href,
      });
      continue;
    }

    if (student.inactiveDays >= 7) {
      items.push({
        student,
        kind: "inactive_7",
        title: student.displayName,
        detail: `${student.inactiveDays}일간 로그인 없음`,
        href,
      });
      continue;
    }

    if (student.dueToday >= 10) {
      items.push({
        student,
        kind: "high_due",
        title: student.displayName,
        detail: `복습 예정 ${student.dueToday}문제 밀림`,
        href,
      });
      continue;
    }

    if (student.dueToday >= 3 && student.reviewedToday === 0) {
      items.push({
        student,
        kind: "no_review_today",
        title: student.displayName,
        detail: `오늘 할 복습 ${student.dueToday}문제 · 아직 미착수`,
        href,
      });
      continue;
    }

    if (student.dueToday >= 5) {
      items.push({
        student,
        kind: "due_backlog",
        title: student.displayName,
        detail: `오늘 복습 ${student.dueToday}문제 대기`,
        href,
      });
    }
  }

  const order: Record<AttentionKind, number> = {
    never_login: 0,
    inactive_7: 1,
    high_due: 2,
    no_review_today: 3,
    due_backlog: 4,
  };

  return items
    .sort(
      (a, b) =>
        order[a.kind] - order[b.kind] ||
        b.student.dueToday - a.student.dueToday ||
        b.student.inactiveDays - a.student.inactiveDays,
    )
    .slice(0, limit);
}

export type StaffGroupKey =
  | "due_today"
  | "backlog"
  | "inactive_7"
  | "never_login";

export type StaffGroup = {
  key: StaffGroupKey;
  label: string;
  hint: string;
  students: AdminStudentRow[];
  /** 각 학생 옆에 보여줄 근거 수치 */
  describe: (student: AdminStudentRow) => string;
};

/**
 * 카드 숫자와 목록이 항상 같은 배열에서 나오도록 그룹을 한 번에 만든다.
 * (카드 수치와 실제 학생이 어긋나는 문제 방지)
 */
export function buildStaffGroups(students: AdminStudentRow[]): StaffGroup[] {
  const loggedInEver = students.filter((s) => s.lastLoginAt !== null);

  return [
    {
      key: "due_today",
      label: "오늘 복습 대상",
      hint: "오늘 마감 문제가 있는 학생",
      students: students.filter((s) => s.dueToday > 0),
      describe: (s) =>
        s.reviewedToday > 0
          ? `대기 ${s.dueToday}문제 · 오늘 ${s.reviewedToday}회 완료`
          : `대기 ${s.dueToday}문제 · 아직 미착수`,
    },
    {
      key: "backlog",
      label: "복습 밀림",
      hint: "대기 5문제 이상",
      students: students.filter((s) => s.dueToday >= 5),
      describe: (s) => `대기 ${s.dueToday}문제`,
    },
    {
      key: "inactive_7",
      label: "7일 미접속",
      hint: "연락·케어 필요",
      students: loggedInEver.filter((s) => s.inactiveDays >= 7),
      describe: (s) => `${s.inactiveDays}일간 로그인 없음`,
    },
    {
      key: "never_login",
      label: "미로그인",
      hint: "계정 안내 필요",
      students: students.filter((s) => s.lastLoginAt === null),
      describe: () => "아직 첫 로그인 없음",
    },
  ];
}

export function summarizeStaffToday(students: AdminStudentRow[]) {
  const dueStudents = students.filter((s) => s.dueToday > 0);
  const reviewedToday = students.filter((s) => s.reviewedToday > 0);
  const inactive7 = students.filter((s) => s.inactiveDays >= 7);
  const backlog = students.filter((s) => s.dueToday >= 5);
  const dueQuestionTotal = students.reduce((sum, s) => sum + s.dueToday, 0);
  const reviewedQuestionTotal = students.reduce(
    (sum, s) => sum + s.reviewedToday,
    0,
  );
  const completionPct =
    dueQuestionTotal + reviewedQuestionTotal > 0
      ? Math.round(
          (reviewedQuestionTotal /
            Math.max(dueQuestionTotal + reviewedQuestionTotal, 1)) *
            100,
        )
      : null;

  return {
    dueStudents: dueStudents.length,
    reviewedToday: reviewedToday.length,
    inactive7: inactive7.length,
    backlog: backlog.length,
    dueQuestionTotal,
    reviewedQuestionTotal,
    completionPct,
  };
}
