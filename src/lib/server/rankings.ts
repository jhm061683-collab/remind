import { formatCompactClassLabel } from "@/lib/admin/class-label";
import { toGradeLabel } from "@/lib/admin/grade";
import { createServiceClient } from "@/lib/supabase/service";
import { toDateKey } from "@/lib/utils/date-range";
import { unstable_cache } from "next/cache";

export type SchoolLevelBand = "middle" | "high";

/** 학습량 점수 가중치 (AI 사용량 제외) */
export const STUDY_WEIGHTS = {
  short: 2,
  medium: 3,
  long: 4,
  attendance: 5,
} as const;

export type ClassMembership = {
  classId: string;
  className: string;
  displayLabel: string;
  teacherNames: string[];
  classImageUrl: string | null;
  classSchoolLevel: "elementary" | "middle" | "high" | "adult" | null;
  gradeNumber: number | null;
};

export type ClassRankSlice = {
  classId: string;
  className: string;
  displayLabel: string;
  teacherNames: string[];
  classImageUrl: string | null;
  classRank: number | null;
  classTotal: number | null;
  classAcademyRank: number | null;
  classAcademyTotal: number | null;
  classLevelRank: number | null;
  classLevelTotal: number | null;
};

export type StudentRankCard = {
  studentId: string;
  displayName: string;
  avatarUrl: string | null;
  schoolLevel: "elementary" | "middle" | "high" | "adult" | null;
  gradeLabel: string | null;
  studyScore: number;
  monthlyReviews: number;
  attendanceDays: number;
  shortCount: number;
  mediumCount: number;
  longCount: number;
  academyRank: number;
  academyTotal: number;
  levelRank: number | null;
  levelTotal: number | null;
  classes: ClassMembership[];
  classRanks: ClassRankSlice[];
  classId: string | null;
  className: string | null;
  classImageUrl: string | null;
  classRank: number | null;
  classTotal: number | null;
  classAcademyRank: number | null;
  classAcademyTotal: number | null;
  classLevelRank: number | null;
  classLevelTotal: number | null;
};

export type HallOfFamePerson = {
  studentId: string;
  displayName: string;
  avatarUrl: string | null;
  rank: number;
  studyScore: number;
  monthlyReviews: number;
  attendanceDays: number;
  className: string | null;
  classDisplayLabel: string | null;
  teacherNames: string[];
};

export type HallOfFameClass = {
  classId: string;
  className: string;
  displayLabel: string;
  teacherNames: string[];
  imageUrl: string | null;
  rank: number;
  avgScore: number;
  studentCount: number;
};

export type AcademyHallOfFame = {
  monthLabel: string;
  monthKey: string;
  schoolLevel: SchoolLevelBand | null;
  levelLabel: string | null;
  students: HallOfFamePerson[];
  classes: HallOfFameClass[];
};

/** 이번 달 라이브 전체 랭킹 (학생 홈용) */
export type AcademyMonthlyBoard = AcademyHallOfFame;

export type LearningLeaderboardRow = {
  studentId: string;
  displayName: string;
  avatarUrl: string | null;
  gradeLabel: string | null;
  classLabel: string | null;
  schoolLevel: "elementary" | "middle" | "high" | "adult" | null;
  gradeNumber: number | null;
  classIds: string[];
  classOptions: Array<{ id: string; label: string }>;
  teacherNames: string[];
  studyScore: number;
  shortCount: number;
  mediumCount: number;
  longCount: number;
  attendanceDays: number;
  rank: number;
};

type StudentAgg = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  schoolLevel: "elementary" | "middle" | "high" | "adult" | null;
  gradeNumber: number | null;
  classes: ClassMembership[];
  studyScore: number;
  monthlyReviews: number;
  attendanceDays: number;
  shortCount: number;
  mediumCount: number;
  longCount: number;
};

function formatMonthLabel(monthKey: string): string {
  return `${monthKey.slice(0, 4)}년 ${Number(monthKey.slice(5, 7))}월`;
}

function levelLabelOf(
  level: "elementary" | "middle" | "high" | "adult" | null | undefined,
): string | null {
  if (level === "middle") return "중등부";
  if (level === "high") return "고등부";
  return null;
}

function toBand(level: string | null | undefined): SchoolLevelBand | null {
  if (level === "middle" || level === "high") return level;
  return null;
}

export function monthKeyOf(date = new Date()): string {
  return toDateKey(date).slice(0, 7);
}

export function previousMonthKey(date = new Date()): string {
  const key = toDateKey(date);
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

function monthRangeIso(monthKey: string): { startIso: string; endIso: string } {
  const [ys, ms] = monthKey.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const lastDay = new Date(y, m, 0).getDate();
  const endDay = String(lastDay).padStart(2, "0");
  return {
    startIso: `${monthKey}-01T00:00:00+09:00`,
    endIso: `${monthKey}-${endDay}T23:59:59.999+09:00`,
  };
}

function computeStudyScore(input: {
  shortCount: number;
  mediumCount: number;
  longCount: number;
  attendanceDays: number;
}): number {
  return (
    input.shortCount * STUDY_WEIGHTS.short +
    input.mediumCount * STUDY_WEIGHTS.medium +
    input.longCount * STUDY_WEIGHTS.long +
    input.attendanceDays * STUDY_WEIGHTS.attendance
  );
}

/** 동점 시 출석일수로 가른다 */
function rankWithAttendanceTiebreak(
  items: Array<{ score: number; attendance: number }>,
): number[] {
  const order = items
    .map((item, index) => ({ ...item, index }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.attendance - a.attendance ||
        a.index - b.index,
    );
  const ranks = new Array<number>(items.length);
  let rank = 1;
  for (let k = 0; k < order.length; k++) {
    if (k > 0) {
      const prev = order[k - 1]!;
      const cur = order[k]!;
      if (prev.score !== cur.score || prev.attendance !== cur.attendance) {
        rank = k + 1;
      }
    }
    ranks[order[k]!.index] = rank;
  }
  return ranks;
}

async function loadClassMemberships(
  academyId: string,
  studentIds: string[],
): Promise<Map<string, ClassMembership[]>> {
  const map = new Map<string, ClassMembership[]>();
  if (studentIds.length === 0) return map;
  const supabase = createServiceClient();
  const { data: memberships } = await supabase
    .from("class_room_students")
    .select(
      "student_id, class_rooms(id, name, image_url, school_level, grade_number, academy_id)",
    )
    .in("student_id", studentIds);

  const classIds: string[] = [];
  type Room = {
    id: string;
    name: string;
    image_url: string | null;
    school_level: ClassMembership["classSchoolLevel"];
    grade_number: number | null;
    academy_id: string;
  };
  const pending: Array<{ studentId: string; room: Room }> = [];

  for (const row of memberships ?? []) {
    const raw = row.class_rooms as unknown;
    const room = (Array.isArray(raw) ? raw[0] : raw) as Room | null;
    if (!room || room.academy_id !== academyId) continue;
    classIds.push(room.id);
    pending.push({ studentId: row.student_id as string, room });
  }

  const teachersByClass = new Map<string, string[]>();
  const uniqueClassIds = Array.from(new Set(classIds));
  if (uniqueClassIds.length > 0) {
    const { data: teacherRows } = await supabase
      .from("class_room_teachers")
      .select("class_room_id, teacher_id")
      .in("class_room_id", uniqueClassIds);
    const teacherIds = Array.from(
      new Set((teacherRows ?? []).map((r) => r.teacher_id as string)),
    );
    const nameById = new Map<string, string>();
    if (teacherIds.length > 0) {
      const { data: teacherProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, nickname")
        .in("id", teacherIds);
      for (const p of teacherProfiles ?? []) {
        const name =
          (p.nickname as string | null)?.trim() ||
          (p.display_name as string | null)?.trim() ||
          "선생님";
        nameById.set(p.id as string, name);
      }
    }
    for (const row of teacherRows ?? []) {
      const name = nameById.get(row.teacher_id as string);
      if (!name) continue;
      const list = teachersByClass.get(row.class_room_id as string) ?? [];
      if (!list.includes(name)) list.push(name);
      teachersByClass.set(row.class_room_id as string, list);
    }
  }

  for (const { studentId, room } of pending) {
    const list = map.get(studentId) ?? [];
    if (list.some((c) => c.classId === room.id)) continue;
    list.push({
      classId: room.id,
      className: room.name,
      displayLabel: formatCompactClassLabel(
        room.name,
        room.school_level,
        room.grade_number,
      ),
      teacherNames: teachersByClass.get(room.id) ?? [],
      classImageUrl: room.image_url,
      classSchoolLevel: room.school_level,
      gradeNumber: room.grade_number,
    });
    map.set(studentId, list);
  }
  return map;
}

type StudyMetrics = {
  shortCount: number;
  mediumCount: number;
  longCount: number;
  monthlyReviews: number;
  attendanceDays: number;
  studyScore: number;
};

async function loadStudyMetrics(
  studentIds: string[],
  monthKey: string,
): Promise<Map<string, StudyMetrics>> {
  const result = new Map<string, StudyMetrics>();
  for (const id of studentIds) {
    result.set(id, {
      shortCount: 0,
      mediumCount: 0,
      longCount: 0,
      monthlyReviews: 0,
      attendanceDays: 0,
      studyScore: 0,
    });
  }
  if (studentIds.length === 0) return result;

  const { startIso, endIso } = monthRangeIso(monthKey);
  const supabase = createServiceClient();

  const [{ data: events }, { data: logins }] = await Promise.all([
    supabase
      .from("activity_events")
      .select("user_id, question_id, created_at")
      .eq("event_type", "reviewed")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .in("user_id", studentIds),
    supabase
      .from("login_events")
      .select("user_id, logged_in_at")
      .gte("logged_in_at", startIso)
      .lte("logged_in_at", endIso)
      .in("user_id", studentIds),
  ]);

  const questionIds = Array.from(
    new Set(
      (events ?? [])
        .map((e) => e.question_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const phaseByQuestion = new Map<string, string>();
  if (questionIds.length > 0) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id, phase")
      .in("id", questionIds);
    for (const q of questions ?? []) {
      phaseByQuestion.set(q.id as string, String(q.phase ?? "short"));
    }
  }

  const attendDays = new Map<string, Set<string>>();
  for (const id of studentIds) attendDays.set(id, new Set());

  for (const row of events ?? []) {
    const id = row.user_id as string;
    const metrics = result.get(id);
    if (!metrics) continue;
    metrics.monthlyReviews += 1;
    const phase = phaseByQuestion.get(String(row.question_id ?? "")) ?? "short";
    if (phase === "medium") metrics.mediumCount += 1;
    else if (phase === "long") metrics.longCount += 1;
    else metrics.shortCount += 1;
    const day = toDateKey(new Date(row.created_at as string));
    attendDays.get(id)?.add(day);
  }

  for (const row of logins ?? []) {
    const id = row.user_id as string;
    const day = toDateKey(new Date(row.logged_in_at as string));
    attendDays.get(id)?.add(day);
  }

  for (const [id, metrics] of result) {
    metrics.attendanceDays = attendDays.get(id)?.size ?? 0;
    metrics.studyScore = computeStudyScore(metrics);
  }
  return result;
}

async function loadLiveMonthStudentsUncached(
  academyId: string,
  monthKey: string,
): Promise<StudentAgg[]> {
  const supabase = createServiceClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, school_level, grade_number, withdrawn_at",
    )
    .eq("academy_id", academyId)
    .eq("role", "student")
    .is("withdrawn_at", null);

  const base = (profiles ?? []).map((p) => ({
    id: p.id as string,
    displayName: String(p.display_name ?? "학생"),
    avatarUrl: (p.avatar_url as string | null) ?? null,
    schoolLevel: (p.school_level as StudentAgg["schoolLevel"]) ?? null,
    gradeNumber: (p.grade_number as number | null) ?? null,
  }));
  const ids = base.map((s) => s.id);
  const [classesMap, metrics] = await Promise.all([
    loadClassMemberships(academyId, ids),
    loadStudyMetrics(ids, monthKey),
  ]);

  return base.map((s) => {
    const m = metrics.get(s.id)!;
    const classes = (classesMap.get(s.id) ?? []).map((cls) => ({
      ...cls,
      displayLabel: formatCompactClassLabel(
        cls.className,
        cls.classSchoolLevel ?? s.schoolLevel,
        cls.gradeNumber ?? s.gradeNumber,
      ),
    }));
    return {
      ...s,
      classes,
      studyScore: m.studyScore,
      monthlyReviews: m.monthlyReviews,
      attendanceDays: m.attendanceDays,
      shortCount: m.shortCount,
      mediumCount: m.mediumCount,
      longCount: m.longCount,
    };
  });
}

async function loadLiveMonthStudents(
  academyId: string,
  monthKey: string,
): Promise<StudentAgg[]> {
  const cached = unstable_cache(
    () => loadLiveMonthStudentsUncached(academyId, monthKey),
    ["live-month-students", academyId, monthKey],
    { revalidate: 60 },
  );
  return cached();
}

type SnapshotRow = {
  student_id: string;
  display_name: string;
  avatar_url: string | null;
  school_level: string | null;
  grade_number: number | null;
  classes: unknown;
  review_count: number;
  study_score: number | null;
  short_count: number | null;
  medium_count: number | null;
  long_count: number | null;
  attendance_days: number | null;
  enrolled_at_month_end: boolean;
};

function parseClasses(raw: unknown): ClassMembership[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as Partial<ClassMembership>;
      if (!row.classId || !row.className) return null;
      return {
        classId: row.classId,
        className: row.className,
        displayLabel:
          row.displayLabel ??
          formatCompactClassLabel(
            row.className,
            row.classSchoolLevel ?? null,
            row.gradeNumber ?? null,
          ),
        teacherNames: Array.isArray(row.teacherNames) ? row.teacherNames : [],
        classImageUrl: row.classImageUrl ?? null,
        classSchoolLevel: row.classSchoolLevel ?? null,
        gradeNumber: row.gradeNumber ?? null,
      } satisfies ClassMembership;
    })
    .filter((c): c is ClassMembership => Boolean(c));
}

/**
 * 지난달 랭킹(학생 홈 · TOP100).
 * 월말 재원생만 포함. 퇴원생의 그 달 학습량은 라이브 랭킹에서 제외되며,
 * 이미 확정된 지난달 랭킹만 다음 달 한 달 동안 전시된다.
 */
export async function ensureMonthSnapshot(
  academyId: string,
  monthKey: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("academy_month_scores")
    .select("student_id, enrolled_at_month_end")
    .eq("academy_id", academyId)
    .eq("month_key", monthKey);
  if ((existing ?? []).some((row) => row.enrolled_at_month_end)) return;

  const currentKey = monthKeyOf();
  if (monthKey >= currentKey) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, school_level, grade_number, withdrawn_at",
    )
    .eq("academy_id", academyId)
    .eq("role", "student");

  const monthEnd = monthRangeIso(monthKey).endIso.slice(0, 10);
  const eligible = (profiles ?? []).filter((p) => {
    const withdrawn = p.withdrawn_at as string | null;
    if (!withdrawn) return true;
    return withdrawn.slice(0, 10) > monthEnd;
  });

  const ids = eligible.map((p) => p.id as string);
  const [classesMap, metrics] = await Promise.all([
    loadClassMemberships(academyId, ids),
    loadStudyMetrics(ids, monthKey),
  ]);

  const rows = eligible.map((p) => {
    const m = metrics.get(p.id as string)!;
    return {
      academy_id: academyId,
      month_key: monthKey,
      student_id: p.id as string,
      display_name: String(p.display_name ?? "학생"),
      avatar_url: (p.avatar_url as string | null) ?? null,
      school_level: (p.school_level as string | null) ?? null,
      grade_number: (p.grade_number as number | null) ?? null,
      classes: classesMap.get(p.id as string) ?? [],
      review_count: m.monthlyReviews,
      study_score: m.studyScore,
      short_count: m.shortCount,
      medium_count: m.mediumCount,
      long_count: m.longCount,
      attendance_days: m.attendanceDays,
      enrolled_at_month_end: true,
      kept_until: null,
      updated_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) return;
  await supabase.from("academy_month_scores").upsert(rows, {
    onConflict: "academy_id,month_key,student_id",
  });
}

async function loadSnapshotStudents(
  academyId: string,
  monthKey: string,
): Promise<StudentAgg[]> {
  await ensureMonthSnapshot(academyId, monthKey);
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("academy_month_scores")
    .select(
      "student_id, display_name, avatar_url, school_level, grade_number, classes, review_count, study_score, short_count, medium_count, long_count, attendance_days, enrolled_at_month_end",
    )
    .eq("academy_id", academyId)
    .eq("month_key", monthKey)
    .eq("enrolled_at_month_end", true);

  const rows = (data ?? []) as SnapshotRow[];
  return rows.map((r) => {
    const shortCount = r.short_count ?? 0;
    const mediumCount = r.medium_count ?? 0;
    const longCount = r.long_count ?? 0;
    const attendanceDays = r.attendance_days ?? 0;
    const studyScore =
      r.study_score ??
      computeStudyScore({ shortCount, mediumCount, longCount, attendanceDays });
    const schoolLevel = (r.school_level as StudentAgg["schoolLevel"]) ?? null;
    const gradeNumber = r.grade_number;
    const classes = parseClasses(r.classes).map((cls) => ({
      ...cls,
      displayLabel: formatCompactClassLabel(
        cls.className,
        cls.classSchoolLevel ?? schoolLevel,
        cls.gradeNumber ?? gradeNumber,
      ),
    }));
    return {
      id: r.student_id,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      schoolLevel,
      gradeNumber,
      classes,
      studyScore,
      monthlyReviews: r.review_count,
      attendanceDays,
      shortCount,
      mediumCount,
      longCount,
    };
  });
}

function buildClassAvg(students: StudentAgg[]) {
  const classAvg = new Map<
    string,
    {
      className: string;
      displayLabel: string;
      teacherNames: string[];
      imageUrl: string | null;
      level: ClassMembership["classSchoolLevel"];
      totalScore: number;
      count: number;
    }
  >();
  for (const s of students) {
    for (const cls of s.classes) {
      const prev = classAvg.get(cls.classId) ?? {
        className: cls.className,
        displayLabel: cls.displayLabel,
        teacherNames: [...cls.teacherNames],
        imageUrl: cls.classImageUrl,
        level: cls.classSchoolLevel ?? s.schoolLevel,
        totalScore: 0,
        count: 0,
      };
      prev.totalScore += s.studyScore;
      prev.count += 1;
      // 학년 정보가 있는 라벨을 우선
      if (
        /\d/.test(cls.displayLabel) &&
        !/\d/.test(prev.displayLabel)
      ) {
        prev.displayLabel = cls.displayLabel;
      }
      for (const t of cls.teacherNames) {
        if (!prev.teacherNames.includes(t)) prev.teacherNames.push(t);
      }
      classAvg.set(cls.classId, prev);
    }
  }
  return Array.from(classAvg.entries()).map(([id, v]) => ({
    id,
    className: v.className,
    displayLabel: v.displayLabel,
    teacherNames: v.teacherNames,
    imageUrl: v.imageUrl,
    avg: v.count === 0 ? 0 : v.totalScore / v.count,
    count: v.count,
    level: v.level,
    attendanceProxy: v.count,
  }));
}

function computeClassRanksForStudent(
  students: StudentAgg[],
  me: StudentAgg,
): ClassRankSlice[] {
  const classEntries = buildClassAvg(students);
  const academyClassRanks = rankWithAttendanceTiebreak(
    classEntries.map((c) => ({ score: c.avg, attendance: c.count })),
  );
  const myBand = toBand(me.schoolLevel);

  return me.classes.map((cls) => {
    const classPeers = students.filter((s) =>
      s.classes.some((c) => c.classId === cls.classId),
    );
    const classRanks = rankWithAttendanceTiebreak(
      classPeers.map((s) => ({
        score: s.studyScore,
        attendance: s.attendanceDays,
      })),
    );
    const classIdx = classPeers.findIndex((s) => s.id === me.id);

    const myClassAcademyIdx = classEntries.findIndex((c) => c.id === cls.classId);
    const levelClassEntries = classEntries.filter(
      (c) => toBand(c.level) === myBand && myBand != null,
    );
    const levelClassRanks = rankWithAttendanceTiebreak(
      levelClassEntries.map((c) => ({ score: c.avg, attendance: c.count })),
    );
    const myClassLevelIdx = levelClassEntries.findIndex((c) => c.id === cls.classId);

    return {
      classId: cls.classId,
      className: cls.className,
      displayLabel: cls.displayLabel,
      teacherNames: cls.teacherNames,
      classImageUrl: cls.classImageUrl,
      classRank: classIdx >= 0 ? classRanks[classIdx]! : null,
      classTotal: classPeers.length || null,
      classAcademyRank:
        myClassAcademyIdx >= 0 ? academyClassRanks[myClassAcademyIdx]! : null,
      classAcademyTotal: classEntries.length || null,
      classLevelRank:
        myClassLevelIdx >= 0 ? levelClassRanks[myClassLevelIdx]! : null,
      classLevelTotal: levelClassEntries.length || null,
    };
  });
}

export async function getStudentRankCard(
  academyId: string,
  studentId: string,
): Promise<StudentRankCard | null> {
  const monthKey = monthKeyOf();
  const students = await loadLiveMonthStudents(academyId, monthKey);
  const me = students.find((s) => s.id === studentId);
  if (!me) return null;

  const academyRanks = rankWithAttendanceTiebreak(
    students.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  const academyRank = academyRanks[students.findIndex((s) => s.id === studentId)]!;

  const myBand = toBand(me.schoolLevel);
  const levelPeers = myBand
    ? students.filter((s) => toBand(s.schoolLevel) === myBand)
    : [];
  const levelRanks = rankWithAttendanceTiebreak(
    levelPeers.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  const levelIdx = levelPeers.findIndex((s) => s.id === studentId);

  const classRanks = computeClassRanksForStudent(students, me);
  const primary = classRanks[0] ?? null;
  const primaryClass = me.classes[0] ?? null;

  return {
    studentId: me.id,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl,
    schoolLevel: me.schoolLevel,
    gradeLabel: toGradeLabel(me.schoolLevel, me.gradeNumber),
    studyScore: me.studyScore,
    monthlyReviews: me.monthlyReviews,
    attendanceDays: me.attendanceDays,
    shortCount: me.shortCount,
    mediumCount: me.mediumCount,
    longCount: me.longCount,
    academyRank,
    academyTotal: students.length,
    levelRank: levelIdx >= 0 ? levelRanks[levelIdx]! : null,
    levelTotal: levelPeers.length || null,
    classes: me.classes,
    classRanks,
    classId: primaryClass?.classId ?? null,
    className: primaryClass?.displayLabel ?? primaryClass?.className ?? null,
    classImageUrl: primaryClass?.classImageUrl ?? null,
    classRank: primary?.classRank ?? null,
    classTotal: primary?.classTotal ?? null,
    classAcademyRank: primary?.classAcademyRank ?? null,
    classAcademyTotal: primary?.classAcademyTotal ?? null,
    classLevelRank: primary?.classLevelRank ?? null,
    classLevelTotal: primary?.classLevelTotal ?? null,
  };
}

function buildScopedBoard(
  students: StudentAgg[],
  monthKey: string,
  viewerSchoolLevel: string | null | undefined,
  options?: { personLimit?: number; classLimit?: number },
): AcademyHallOfFame {
  const band = toBand(viewerSchoolLevel);
  const scoped = band
    ? students.filter((s) => toBand(s.schoolLevel) === band)
    : students;

  const personRanks = rankWithAttendanceTiebreak(
    scoped.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  let people: HallOfFamePerson[] = scoped
    .map((s, i) => ({
      studentId: s.id,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      rank: personRanks[i]!,
      studyScore: s.studyScore,
      monthlyReviews: s.monthlyReviews,
      attendanceDays: s.attendanceDays,
      className: s.classes[0]?.className ?? null,
      classDisplayLabel: s.classes[0]
        ? formatCompactClassLabel(
            s.classes[0].className,
            s.classes[0].classSchoolLevel ?? s.schoolLevel,
            s.classes[0].gradeNumber ?? s.gradeNumber,
          )
        : null,
      teacherNames: s.classes[0]?.teacherNames ?? [],
    }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        b.studyScore - a.studyScore ||
        b.attendanceDays - a.attendanceDays,
    );

  if (options?.personLimit != null) {
    people = people
      .slice(0, options.personLimit)
      .map((p, index) => ({ ...p, rank: index + 1 }));
  }

  const classEntries = buildClassAvg(scoped).filter(
    (c) => !band || toBand(c.level) === band,
  );
  const classRanks = rankWithAttendanceTiebreak(
    classEntries.map((c) => ({ score: c.avg, attendance: c.count })),
  );
  let classes: HallOfFameClass[] = classEntries
    .map((c, i) => ({
      classId: c.id,
      className: c.className,
      displayLabel: c.displayLabel,
      teacherNames: c.teacherNames,
      imageUrl: c.imageUrl,
      rank: classRanks[i]!,
      avgScore: Math.round(c.avg * 10) / 10,
      studentCount: c.count,
    }))
    .sort((a, b) => a.rank - b.rank || b.avgScore - a.avgScore);

  if (options?.classLimit != null) {
    classes = classes
      .slice(0, options.classLimit)
      .map((c, index) => ({ ...c, rank: index + 1 }));
  }

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    schoolLevel: band,
    levelLabel: levelLabelOf(band),
    students: people,
    classes,
  };
}

export async function getAcademyHallOfFame(
  academyId: string,
  viewerSchoolLevel?: string | null,
): Promise<AcademyHallOfFame> {
  const monthKey = previousMonthKey();
  const students = await loadSnapshotStudents(academyId, monthKey);
  return buildScopedBoard(students, monthKey, viewerSchoolLevel, {
    personLimit: 100,
    classLimit: 100,
  });
}

/** 이번 달 학교급(중등/고등 등) 전체 랭킹 — 학생 홈 기본 표시 */
export async function getAcademyMonthlyBoard(
  academyId: string,
  viewerSchoolLevel?: string | null,
): Promise<AcademyMonthlyBoard> {
  const monthKey = monthKeyOf();
  const students = await loadLiveMonthStudents(academyId, monthKey);
  return buildScopedBoard(students, monthKey, viewerSchoolLevel);
}

/**
 * 학생 홈용 — loadLiveMonthStudents를 1회만 호출해
 * 내 랭크 카드 + 월간 보드를 함께 만든다.
 */
export async function getStudentHomeRankingBundle(
  academyId: string,
  studentId: string,
  viewerSchoolLevel?: string | null,
): Promise<{
  rank: StudentRankCard | null;
  monthlyBoard: AcademyMonthlyBoard;
}> {
  const monthKey = monthKeyOf();
  const students = await loadLiveMonthStudents(academyId, monthKey);
  const monthlyBoard = buildScopedBoard(students, monthKey, viewerSchoolLevel);

  const me = students.find((s) => s.id === studentId);
  if (!me) return { rank: null, monthlyBoard };

  const academyRanks = rankWithAttendanceTiebreak(
    students.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  const academyRank =
    academyRanks[students.findIndex((s) => s.id === studentId)]!;

  const myBand = toBand(me.schoolLevel);
  const levelPeers = myBand
    ? students.filter((s) => toBand(s.schoolLevel) === myBand)
    : [];
  const levelRanks = rankWithAttendanceTiebreak(
    levelPeers.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  const levelIdx = levelPeers.findIndex((s) => s.id === studentId);
  const classRanks = computeClassRanksForStudent(students, me);
  const primary = classRanks[0] ?? null;
  const primaryClass = me.classes[0] ?? null;

  const rank: StudentRankCard = {
    studentId: me.id,
    displayName: me.displayName,
    avatarUrl: me.avatarUrl,
    schoolLevel: me.schoolLevel,
    gradeLabel: toGradeLabel(me.schoolLevel, me.gradeNumber),
    studyScore: me.studyScore,
    monthlyReviews: me.monthlyReviews,
    attendanceDays: me.attendanceDays,
    shortCount: me.shortCount,
    mediumCount: me.mediumCount,
    longCount: me.longCount,
    academyRank,
    academyTotal: students.length,
    levelRank: levelIdx >= 0 ? levelRanks[levelIdx]! : null,
    levelTotal: levelPeers.length || null,
    classes: me.classes,
    classRanks,
    classId: primaryClass?.classId ?? null,
    className: primaryClass?.displayLabel ?? primaryClass?.className ?? null,
    classImageUrl: primaryClass?.classImageUrl ?? null,
    classRank: primary?.classRank ?? null,
    classTotal: primary?.classTotal ?? null,
    classAcademyRank: primary?.classAcademyRank ?? null,
    classAcademyTotal: primary?.classAcademyTotal ?? null,
    classLevelRank: primary?.classLevelRank ?? null,
    classLevelTotal: primary?.classLevelTotal ?? null,
  };

  return { rank, monthlyBoard };
}

/** 원장용 이번 달 학습량 랭킹 (AI 제외). 필터용 메타 포함. */
export async function getAcademyLearningLeaderboard(
  academyId: string,
  limit = 500,
): Promise<LearningLeaderboardRow[]> {
  const students = await loadLiveMonthStudents(academyId, monthKeyOf());
  const ranks = rankWithAttendanceTiebreak(
    students.map((s) => ({
      score: s.studyScore,
      attendance: s.attendanceDays,
    })),
  );
  return students
    .map((s, i) => {
      const teacherNames = Array.from(
        new Set(s.classes.flatMap((c) => c.teacherNames)),
      );
      return {
        studentId: s.id,
        displayName: s.displayName,
        avatarUrl: s.avatarUrl,
        gradeLabel: toGradeLabel(s.schoolLevel, s.gradeNumber),
        classLabel: s.classes[0]?.displayLabel ?? null,
        schoolLevel: s.schoolLevel,
        gradeNumber: s.gradeNumber,
        classIds: s.classes.map((c) => c.classId),
        classOptions: s.classes.map((c) => ({
          id: c.classId,
          label: c.displayLabel || c.className,
        })),
        teacherNames,
        studyScore: s.studyScore,
        shortCount: s.shortCount,
        mediumCount: s.mediumCount,
        longCount: s.longCount,
        attendanceDays: s.attendanceDays,
        rank: ranks[i]!,
      };
    })
    .sort((a, b) => a.rank - b.rank || b.studyScore - a.studyScore)
    .slice(0, limit);
}
