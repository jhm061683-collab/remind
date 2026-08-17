import {
  encodeSolveConfidenceMemo,
  parseSolveConfidenceMemo,
} from "../src/lib/utils/solve-confidence.ts";
import {
  buildAttentionQueue,
  buildStaffGroups,
} from "../src/lib/utils/staff-attention.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const memo = encodeSolveConfidenceMemo("unsure", "계산 실수");
assert(memo.includes("[풀때느낌:애매함]"), "confidence encode");
assert(parseSolveConfidenceMemo(memo).confidence === "unsure", "confidence parse");
assert(parseSolveConfidenceMemo(memo).memo === "계산 실수", "memo 보존");

function student(overrides) {
  return {
    id: "1",
    displayName: "학생",
    username: "s",
    phone: null,
    schoolLevel: null,
    gradeNumber: null,
    gradeLabel: null,
    className: null,
    classNames: [],
    teacherNames: [],
    subAdminName: null,
    subAdminId: null,
    lastLoginAt: "2026-01-01",
    totalRegistered: 10,
    totalReviews: 1,
    loginStreakDays: 0,
    inactiveDays: 0,
    dueToday: 0,
    reviewedToday: 0,
    passwordPlain: null,
    ...overrides,
  };
}

const inactive = student({ id: "a", inactiveDays: 10, dueToday: 2 });
const attention = buildAttentionQueue([inactive]);
assert(attention.length === 1, "attention queue");
assert(attention[0].kind === "inactive_7", "inactive kind");

const roster = [
  inactive,
  student({ id: "b", dueToday: 6 }),
  student({ id: "c", lastLoginAt: null, inactiveDays: 999 }),
];
const groups = buildStaffGroups(roster);
const byKey = Object.fromEntries(groups.map((g) => [g.key, g]));

// 카드 숫자 = 목록 길이여야 한다 (카드-학생 불일치 회귀 방지)
for (const group of groups) {
  assert(
    group.students.length === group.students.filter(Boolean).length,
    "group list integrity",
  );
}
assert(byKey.due_today.students.length === 2, "오늘 복습 대상 2명");
assert(byKey.backlog.students.length === 1, "복습 밀림 1명");
assert(byKey.inactive_7.students.length === 1, "7일 미접속 1명");
assert(byKey.never_login.students.length === 1, "미로그인 1명");
assert(
  !byKey.inactive_7.students.some((s) => s.lastLoginAt === null),
  "미로그인 학생은 미접속에서 제외",
);

console.log("ux-p0-utils tests OK");
