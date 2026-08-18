import type { ReviewPhase } from "@/types/subject";
import type { ActivityEvent } from "@/lib/types/activity";
import { toGradeLabel } from "@/lib/admin/grade";
import { computePromotedGrade } from "@/lib/admin/grade";
import { formatClassLabel } from "@/lib/admin/class-label";
import { formatStaffLabel } from "@/lib/admin/staff-label";
import { missingStaffProfileIds } from "@/lib/admin/staff-relation";
import type { StoredQuestion } from "@/lib/storage/questions";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { isSupabaseEnabled, isSupabaseUserId } from "@/lib/supabase/config";
import { DEMO_USERS } from "@/lib/auth/users";
import type {
  AdminDashboardData,
  AdminStudentRow,
  ClassManagementData,
  ClassOption,
  ClassRoomSummary,
  ClassStudentBrief,
  DailyActivity,
  PromotionRule,
  StudentDetailData,
  SubAdminRow,
  TeacherClassOverview,
} from "@/lib/types/admin";
import {
  isSameKstDay,
  startOfTodayKstIso,
  toDateKey,
} from "@/lib/utils/date-range";

type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  role: string;
  academy_id: string | null;
  phone: string | null;
  school_level: "elementary" | "middle" | "high" | "adult" | null;
  grade_number: number | null;
  is_director?: boolean | null;
  nickname?: string | null;
  withdrawn_at?: string | null;
};

type AssignmentRow = {
  sub_admin_id: string;
  student_id: string;
};

type ClassStudentRow = {
  student_id: string;
  class_room_id: string;
  class_rooms: {
    name: string;
    school_level: "elementary" | "middle" | "high" | "adult" | null;
    grade_number: number | null;
  } | null;
};

type ClassRoomRow = {
  id: string;
  name: string;
  school_level: "elementary" | "middle" | "high" | "adult" | null;
  grade_number: number | null;
  image_url: string | null;
};

type ClassTeacherRow = {
  class_room_id: string;
  teacher_id: string;
};

type QuestionRow = {
  id: string;
  user_id: string;
  phase: ReviewPhase;
  next_review_date: string;
  last_answered_at: string | null;
  archived: boolean;
  created_at: string;
  wrong_reason: string | null;
};

type ActivityRow = {
  id: string;
  user_id: string;
  event_type: string;
  question_id: string | null;
  wrong_reason: string | null;
  created_at: string;
};

type LoginRow = {
  user_id: string;
  logged_in_at: string;
};

function calcLoginStreakDays(logins: LoginRow[]): number {
  if (logins.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(logins.map((l) => toDateKey(l.logged_in_at))),
  );
  uniqueDays.sort((a, b) => (a > b ? -1 : 1));
  // 한국 달력 기준으로 연속 출석일을 센다.
  let cursor = new Date(`${toDateKey(new Date())}T12:00:00+09:00`);
  let streak = 0;
  for (const day of uniqueDays) {
    const expected = toDateKey(cursor);
    if (day !== expected) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

function calcInactiveDays(lastLoginAt: string | null): number {
  if (!lastLoginAt) return 999;
  const lastKey = toDateKey(lastLoginAt);
  const todayKey = toDateKey(new Date());
  const last = new Date(`${lastKey}T12:00:00+09:00`);
  const today = new Date(`${todayKey}T12:00:00+09:00`);
  return Math.max(
    0,
    Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function endOfDay(date: Date): Date {
  // 마감 판정은 한국 하루의 끝(다음날 00:00 KST 직전)을 쓴다.
  const nextDay = new Date(`${toDateKey(date)}T00:00:00+09:00`);
  nextDay.setTime(nextDay.getTime() + 24 * 60 * 60 * 1000 - 1);
  return nextDay;
}

function isToday(iso: string, now = new Date()): boolean {
  return isSameKstDay(iso, now);
}

function rowToQuestion(row: QuestionRow): StoredQuestion {
  return {
    id: row.id,
    subjectId: "__admin__",
    userId: row.user_id,
    imageDataUrl: "",
    extraImageDataUrls: [],
    answerText: undefined,
    answerImageDataUrl: undefined,
    keywords: [],
    source: undefined,
    wrongReason: row.wrong_reason ?? undefined,
    reflectionMemo: undefined,
    phase: row.phase,
    streakCount: 0,
    nextReviewDate: row.next_review_date,
    lastAnsweredAt: row.last_answered_at ?? undefined,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

function rowToEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    type: row.event_type as ActivityEvent["type"],
    questionId: row.question_id ?? undefined,
    wrongReason: row.wrong_reason ?? undefined,
    createdAt: row.created_at,
  };
}

function computePhaseFulfillment(
  questions: StoredQuestion[],
  events: ActivityEvent[],
  phases: ReviewPhase[],
  now = new Date(),
): number | null {
  const todayEnd = endOfDay(now);
  const reviewedTodayIds = new Set(
    events
      .filter((e) => e.type === "reviewed" && isToday(e.createdAt, now))
      .map((e) => e.questionId)
      .filter((id): id is string => Boolean(id)),
  );

  const due = questions.filter(
    (q) =>
      !q.archived &&
      q.phase !== "completed" &&
      phases.includes(q.phase) &&
      new Date(q.nextReviewDate) <= todayEnd,
  );
  if (due.length === 0) return null;

  const done = due.filter(
    (q) =>
      reviewedTodayIds.has(q.id) ||
      (q.lastAnsweredAt && isToday(q.lastAnsweredAt, now)),
  );
  return Math.round((done.length / due.length) * 100);
}

function buildDailyReviews(
  events: ActivityRow[],
  days = 7,
  now = new Date(),
): DailyActivity[] {
  const result: DailyActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = toDateKey(day);
    const label = new Date(`${key}T12:00:00+09:00`).toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
    });
    const count = events.filter(
      (e) => e.event_type === "reviewed" && toDateKey(e.created_at) === key,
    ).length;
    result.push({ date: key, label, count });
  }
  return result;
}

function demoDashboard(): AdminDashboardData {
  const student = DEMO_USERS.find((u) => u.role === "student")!;
  const teacher = DEMO_USERS.find((u) => u.role === "sub_admin")!;
  const row: AdminStudentRow = {
    id: student.id,
    displayName: student.name,
    username: student.username,
    phone: null,
    schoolLevel: null,
    gradeNumber: null,
    gradeLabel: null,
    className: null,
    classNames: [],
    teacherNames: [teacher.name],
    subAdminName: teacher.name,
    subAdminId: teacher.id,
    lastLoginAt: null,
    totalRegistered: 0,
    totalReviews: 0,
    loginStreakDays: 0,
    inactiveDays: 999,
    dueToday: 0,
    reviewedToday: 0,
  };
  return {
    totalStudents: 1,
    loggedInToday: 0,
    activeToday: 0,
    shortFulfillmentPct: null,
    mediumLongFulfillmentPct: null,
    dailyReviews: Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("ko-KR", {
          month: "numeric",
          day: "numeric",
        }),
        count: 0,
      };
    }),
    students: [row],
    subAdmins: [
      {
        id: teacher.id,
        displayName: teacher.name,
        username: teacher.username,
        assignedCount: 1,
        classCount: 1,
        isDirector: false,
      },
    ],
  };
}

async function getAdminAcademyId(adminId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", adminId)
    .single();
  return data?.academy_id ?? null;
}

async function applyAutoPromotionIfDue(academyId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: rule } = await supabase
    .from("academy_promotion_rules")
    .select("id, promotion_month, promotion_day, timezone, last_promoted_on")
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!rule) return;
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: rule.timezone || "Asia/Seoul" }),
  );
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month !== rule.promotion_month || day !== rule.promotion_day) return;

  const key = `${now.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (rule.last_promoted_on === key) return;

  const { data: students } = await supabase
    .from("profiles")
    .select("id, school_level, grade_number")
    .eq("academy_id", academyId)
    .eq("role", "student");

  for (const row of students ?? []) {
    if (!row.school_level || !row.grade_number) continue;
    const next = computePromotedGrade(
      row.school_level as "elementary" | "middle" | "high" | "adult",
      row.grade_number as number,
    );
    await supabase
      .from("profiles")
      .update({
        school_level: next.schoolLevel,
        grade_number: next.gradeNumber,
      })
      .eq("id", row.id as string);
  }

  await supabase
    .from("academy_promotion_rules")
    .update({ last_promoted_on: key })
    .eq("id", rule.id);
}

async function fetchDashboardForStudentIds(
  studentIds: string[],
  profiles: ProfileRow[],
  assignments: AssignmentRow[],
  academyId: string | null,
): Promise<AdminDashboardData> {
  const supabase = createServiceClient();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const subAdminProfiles = profiles.filter((p) => p.role === "sub_admin");
  const teacherIds = subAdminProfiles.map((p) => p.id);
  const { data: teacherClassRows } =
    teacherIds.length > 0
      ? await supabase
          .from("class_room_teachers")
          .select("class_room_id, teacher_id")
          .in("teacher_id", teacherIds)
      : { data: [] as { class_room_id: string; teacher_id: string }[] };
  const classCountByTeacher = new Map<string, number>();
  for (const row of teacherClassRows ?? []) {
    classCountByTeacher.set(
      row.teacher_id,
      (classCountByTeacher.get(row.teacher_id) ?? 0) + 1,
    );
  }
  const assignmentByStudent = new Map(
    assignments.map((a) => [a.student_id, a.sub_admin_id]),
  );

  // 대시보드에 평생 이력 풀스캔은 하지 않는다.
  // - 활성 문항만 (due/이행률)
  // - 최근 activity/login만 (차트·출석)
  // - 등록 수는 user_id만
  const loginSince = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const activitySince = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const reviewCountSince = loginSince;

  const emptyLogins = Promise.resolve({ data: [] as LoginRow[] });
  const emptyQuestions = Promise.resolve({ data: [] as QuestionRow[] });
  const emptyActivities = Promise.resolve({ data: [] as ActivityRow[] });
  const emptySlim = Promise.resolve({ data: [] as { user_id: string }[] });
  const emptyClasses = Promise.resolve({ data: [] as ClassStudentRow[] });

  const [
    { data: allLoginRows },
    { data: todayLoginRows },
    { data: questionRows },
    { data: activityRows },
    { data: reviewCountRows },
    { data: classStudentsRows },
  ] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("login_events")
          .select("user_id, logged_in_at")
          .in("user_id", studentIds)
          .gte("logged_in_at", loginSince)
          .order("logged_in_at", { ascending: false })
      : emptyLogins,
    studentIds.length > 0
      ? supabase
          .from("login_events")
          .select("user_id, logged_in_at")
          .in("user_id", studentIds)
          .gte("logged_in_at", startOfTodayKstIso())
      : emptyLogins,
    // 미보관 문항 메타만 1회 (등록수 + due/이행률)
    studentIds.length > 0
      ? supabase
          .from("questions")
          .select(
            "id, user_id, phase, next_review_date, last_answered_at, archived, created_at, wrong_reason",
          )
          .in("user_id", studentIds)
          .eq("archived", false)
      : emptyQuestions,
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("id, user_id, event_type, question_id, wrong_reason, created_at")
          .in("user_id", studentIds)
          .gte("created_at", activitySince)
      : emptyActivities,
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("user_id")
          .in("user_id", studentIds)
          .eq("event_type", "reviewed")
          .gte("created_at", reviewCountSince)
      : emptySlim,
    studentIds.length > 0
      ? supabase
          .from("class_room_students")
          .select("student_id, class_room_id, class_rooms(name, school_level, grade_number)")
          .in("student_id", studentIds)
      : emptyClasses,
  ]);

  const allOpenQuestions = (questionRows ?? []) as QuestionRow[];
  const questions = allOpenQuestions.filter((q) => q.phase !== "completed");
  const activities = (activityRows ?? []) as ActivityRow[];
  const allLogins = (allLoginRows ?? []) as LoginRow[];
  const todayLogins = (todayLoginRows ?? []) as LoginRow[];
  const classStudents = (classStudentsRows ?? []) as ClassStudentRow[];

  const registeredCount = new Map<string, number>();
  for (const row of allOpenQuestions) {
    registeredCount.set(
      row.user_id,
      (registeredCount.get(row.user_id) ?? 0) + 1,
    );
  }
  const totalReviewCount = new Map<string, number>();
  for (const row of (reviewCountRows ?? []) as { user_id: string }[]) {
    totalReviewCount.set(
      row.user_id,
      (totalReviewCount.get(row.user_id) ?? 0) + 1,
    );
  }
  const classRoomIds = Array.from(
    new Set(classStudents.map((row) => row.class_room_id)),
  );
  const classTeachers: ClassTeacherRow[] =
    classRoomIds.length > 0
      ? (
          await supabase
            .from("class_room_teachers")
            .select("class_room_id, teacher_id")
            .in("class_room_id", classRoomIds)
        ).data ?? []
      : [];

  const missingTeacherIds = missingStaffProfileIds(
    profileMap.keys(),
    [
      ...classTeachers.map((ct) => ct.teacher_id),
      ...assignments.map((assignment) => assignment.sub_admin_id),
    ],
  );
  if (missingTeacherIds.length > 0) {
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname",
      )
      .in("id", missingTeacherIds);
    for (const row of (teacherProfiles ?? []) as ProfileRow[]) {
      profileMap.set(row.id, row);
    }
  }

  const loggedInToday = new Set(todayLogins.map((l) => l.user_id)).size;
  const activeToday = new Set(
    activities
      .filter((e) => e.event_type === "reviewed" && isToday(e.created_at))
      .map((e) => e.user_id),
  ).size;

  const allQuestions = questions.map(rowToQuestion);
  const allEvents = activities.map(rowToEvent);

  const shortPct = computePhaseFulfillment(allQuestions, allEvents, ["short"]);
  const mediumLongPct = computePhaseFulfillment(allQuestions, allEvents, [
    "medium",
    "long",
  ]);

  const lastLoginMap = new Map<string, string>();
  const loginByStudent = new Map<string, LoginRow[]>();
  for (const row of allLogins) {
    if (!lastLoginMap.has(row.user_id)) {
      lastLoginMap.set(row.user_id, row.logged_in_at);
    }
    const arr = loginByStudent.get(row.user_id) ?? [];
    arr.push(row);
    loginByStudent.set(row.user_id, arr);
  }

  const questionsByUser = new Map<string, StoredQuestion[]>();
  for (const q of allQuestions) {
    const arr = questionsByUser.get(q.userId) ?? [];
    arr.push(q);
    questionsByUser.set(q.userId, arr);
  }

  const activityByUser = new Map<string, ActivityRow[]>();
  for (const a of activities) {
    const arr = activityByUser.get(a.user_id) ?? [];
    arr.push(a);
    activityByUser.set(a.user_id, arr);
  }

  const classByStudent = new Map<string, ClassStudentRow[]>();
  for (const row of classStudents) {
    const arr = classByStudent.get(row.student_id) ?? [];
    arr.push(row);
    classByStudent.set(row.student_id, arr);
  }
  const teacherNamesByClass = new Map<string, string[]>();
  for (const ct of classTeachers) {
    const teacher = profileMap.get(ct.teacher_id);
    if (!teacher) continue;
    const name = formatStaffLabel({
      displayName: teacher.display_name,
      nickname: teacher.nickname,
      role: teacher.role,
      isDirector: teacher.is_director,
    });
    const arr = teacherNamesByClass.get(ct.class_room_id) ?? [];
    arr.push(name);
    teacherNamesByClass.set(ct.class_room_id, arr);
  }

  const students: AdminStudentRow[] = studentIds.map((id) => {
    const userQuestions = questionsByUser.get(id) ?? [];
    const userEvents = (activityByUser.get(id) ?? []).map(rowToEvent);
    const todayEnd = endOfDay(new Date());
    const dueToday = userQuestions.filter(
      (q) =>
        !q.archived &&
        q.phase !== "completed" &&
        new Date(q.nextReviewDate) <= todayEnd,
    ).length;
    const reviewedToday = userEvents.filter(
      (e) => e.type === "reviewed" && isToday(e.createdAt),
    ).length;
    const subAdminId = assignmentByStudent.get(id) ?? null;
    const subAdmin = subAdminId ? profileMap.get(subAdminId) : null;
    const classRows = classByStudent.get(id) ?? [];
    const classNames = classRows
      .map((row) => {
        if (!row.class_rooms?.name) return null;
        return formatClassLabel(
          row.class_rooms.name,
          row.class_rooms.school_level,
          row.class_rooms.grade_number,
        );
      })
      .filter((name): name is string => Boolean(name));
    const className = classNames.length > 0 ? classNames.join(", ") : null;
    const teacherNameSet = new Set<string>();
    for (const classRow of classRows) {
      for (const name of teacherNamesByClass.get(classRow.class_room_id) ?? []) {
        teacherNameSet.add(name);
      }
    }
    const teacherNames = [...teacherNameSet];
    if (subAdmin && teacherNames.length === 0) {
      teacherNames.push(
        formatStaffLabel({
          displayName: subAdmin.display_name,
          nickname: subAdmin.nickname,
          role: subAdmin.role,
          isDirector: subAdmin.is_director,
        }),
      );
    }

    const profile = profileMap.get(id)!;
    const loginsForStudent = loginByStudent.get(id) ?? [];
    const lastLogin = lastLoginMap.get(id) ?? null;

    return {
      id,
      displayName: profile.display_name,
      username: profile.username ?? "—",
      phone: profile.phone ?? null,
      schoolLevel: profile.school_level,
      gradeNumber: profile.grade_number,
      gradeLabel: toGradeLabel(profile.school_level, profile.grade_number),
      className,
      classNames,
      teacherNames,
      subAdminName: subAdmin?.display_name ?? null,
      subAdminId,
      lastLoginAt: lastLogin,
      totalRegistered: registeredCount.get(id) ?? 0,
      totalReviews: totalReviewCount.get(id) ?? 0,
      loginStreakDays: calcLoginStreakDays(loginsForStudent),
      inactiveDays: calcInactiveDays(lastLogin),
      dueToday,
      reviewedToday,
    };
  });

  // 담당 학생 = 직접 배정 ∪ 담당 반의 학생 (중복 제거)
  const studentsByClassRoom = new Map<string, string[]>();
  for (const row of classStudents) {
    const arr = studentsByClassRoom.get(row.class_room_id) ?? [];
    arr.push(row.student_id);
    studentsByClassRoom.set(row.class_room_id, arr);
  }
  const classStudentIdsByTeacher = new Map<string, Set<string>>();
  for (const ct of classTeachers) {
    const set = classStudentIdsByTeacher.get(ct.teacher_id) ?? new Set();
    for (const sid of studentsByClassRoom.get(ct.class_room_id) ?? []) {
      set.add(sid);
    }
    classStudentIdsByTeacher.set(ct.teacher_id, set);
  }

  const subAdmins: SubAdminRow[] = subAdminProfiles.map((p) => {
    const uniqueStudents = new Set<string>(
      assignments
        .filter((a) => a.sub_admin_id === p.id)
        .map((a) => a.student_id),
    );
    for (const sid of classStudentIdsByTeacher.get(p.id) ?? []) {
      uniqueStudents.add(sid);
    }
    return {
      id: p.id,
      displayName: formatStaffLabel({
        displayName: p.display_name,
        nickname: p.nickname,
        role: p.role,
        isDirector: p.is_director,
      }),
      username: p.username ?? "—",
      assignedCount: uniqueStudents.size,
      classCount: classCountByTeacher.get(p.id) ?? 0,
      isDirector: Boolean(p.is_director),
    };
  });

  return {
    totalStudents: studentIds.length,
    loggedInToday,
    activeToday,
    shortFulfillmentPct: shortPct,
    mediumLongFulfillmentPct: mediumLongPct,
    dailyReviews: buildDailyReviews(activities),
    students,
    subAdmins,
  };
}

export async function getAdminDashboard(
  adminId: string,
): Promise<AdminDashboardData> {
  if (!isSupabaseEnabled() || !isServiceRoleConfigured() || !isSupabaseUserId(adminId)) {
    return demoDashboard();
  }

  const academyId = await getAdminAcademyId(adminId);
  if (academyId) await applyAutoPromotionIfDue(academyId);
  const supabase = createServiceClient();

  let profilesQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname, withdrawn_at",
    )
    .in("role", ["student", "sub_admin", "admin"]);
  if (academyId) {
    profilesQuery = profilesQuery.eq("academy_id", academyId);
  }

  const { data: rawProfiles } = await profilesQuery;

  const allProfiles = ((rawProfiles ?? []) as ProfileRow[]).filter(
    (p) => !p.withdrawn_at,
  );
  const studentIds = allProfiles
    .filter((p) => p.role === "student")
    .map((p) => p.id);

  let assignmentsQuery = supabase
    .from("student_assignments")
    .select("sub_admin_id, student_id");
  if (academyId) {
    assignmentsQuery = assignmentsQuery.eq("academy_id", academyId);
  }

  const { data: assignmentRows, error: assignError } = await assignmentsQuery;

  const assignments = assignError
    ? ([] as AssignmentRow[])
    : ((assignmentRows ?? []) as AssignmentRow[]);

  return fetchDashboardForStudentIds(
    studentIds,
    allProfiles,
    assignments,
    academyId,
  );
}

export async function getSubAdminDashboard(
  subAdminId: string,
): Promise<AdminDashboardData> {
  if (
    !isSupabaseEnabled() ||
    !isServiceRoleConfigured() ||
    !isSupabaseUserId(subAdminId)
  ) {
    const demo = demoDashboard();
    return {
      ...demo,
      totalStudents: demo.students.length,
      subAdmins: [],
    };
  }

  const supabase = createServiceClient();
  const [{ data: assignmentRows }, { data: classTeacherRows }] = await Promise.all([
    supabase
      .from("student_assignments")
      .select("sub_admin_id, student_id")
      .eq("sub_admin_id", subAdminId),
    supabase
      .from("class_room_teachers")
      .select("class_room_id")
      .eq("teacher_id", subAdminId),
  ]);

  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  const classRoomIds = (classTeacherRows ?? []).map((row) => row.class_room_id);

  let classStudentIds: string[] = [];
  if (classRoomIds.length > 0) {
    const { data: classStudentRows } = await supabase
      .from("class_room_students")
      .select("student_id")
      .in("class_room_id", classRoomIds);
    classStudentIds = (classStudentRows ?? []).map((row) => row.student_id);
  }

  const studentIds = Array.from(
    new Set([...assignments.map((a) => a.student_id), ...classStudentIds]),
  );
  if (studentIds.length === 0) {
    return {
      totalStudents: 0,
      loggedInToday: 0,
      activeToday: 0,
      shortFulfillmentPct: null,
      mediumLongFulfillmentPct: null,
      dailyReviews: buildDailyReviews([]),
      students: [],
      subAdmins: [],
    };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname")
    .in("id", [...studentIds, subAdminId]);

  const { data: subAdminProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", subAdminId)
    .single();
  if (subAdminProfile?.academy_id) {
    await applyAutoPromotionIfDue(subAdminProfile.academy_id);
  }

  return fetchDashboardForStudentIds(
    studentIds,
    (profiles ?? []) as ProfileRow[],
    assignments,
    subAdminProfile?.academy_id ?? null,
  );
}

export async function assignStudentToSubAdmin(
  adminId: string,
  studentId: string,
  subAdminId: string | null,
): Promise<{ error?: string }> {
  if (!isSupabaseEnabled() || !isServiceRoleConfigured()) {
    return { error: "Supabase 모드에서만 배정할 수 있습니다." };
  }

  const academyId = await getAdminAcademyId(adminId);
  const supabase = createServiceClient();

  await supabase
    .from("student_assignments")
    .delete()
    .eq("student_id", studentId);

  if (!subAdminId) return {};

  const { error } = await supabase.from("student_assignments").insert({
    academy_id: academyId,
    sub_admin_id: subAdminId,
    student_id: studentId,
  });

  if (error) return { error: error.message };
  return {};
}

export async function getPromotionRule(adminId: string): Promise<PromotionRule | null> {
  if (!isSupabaseEnabled() || !isServiceRoleConfigured() || !isSupabaseUserId(adminId)) {
    return null;
  }
  const academyId = await getAdminAcademyId(adminId);
  if (!academyId) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("academy_promotion_rules")
    .select("id, academy_id, promotion_month, promotion_day, timezone")
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    academyId: data.academy_id,
    promotionMonth: data.promotion_month,
    promotionDay: data.promotion_day,
    timezone: data.timezone,
  };
}

export async function getStudentDetailForStaff(
  staffId: string,
  staffRole: "admin" | "sub_admin",
  studentId: string,
): Promise<StudentDetailData | null> {
  if (
    !isSupabaseEnabled() ||
    !isServiceRoleConfigured() ||
    !isSupabaseUserId(staffId) ||
    !isSupabaseUserId(studentId)
  ) {
    const demo = demoDashboard();
    const student = demo.students.find((s) => s.id === studentId) ?? null;
    if (!student) return null;
    return {
      student,
      weeklyReviews: buildDailyReviews([], 14),
      topWeaknesses: [],
      aiEngine: null,
    };
  }

  const supabase = createServiceClient();
  const [{ data: staff }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, academy_id")
      .eq("id", staffId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, role, academy_id, withdrawn_at")
      .eq("id", studentId)
      .maybeSingle(),
  ]);
  if (!staff || !student || student.role !== "student") return null;
  if (student.withdrawn_at) return null;
  if (
    !staff.academy_id ||
    !student.academy_id ||
    staff.academy_id !== student.academy_id
  ) {
    return null;
  }

  const allowed = await staffCanAccessStudent(staffId, staffRole, studentId);
  if (!allowed) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname, withdrawn_at",
    )
    .eq("id", studentId)
    .maybeSingle();
  if (!profile || profile.role !== "student") return null;

  const { data: assignmentRows } = await supabase
    .from("student_assignments")
    .select("sub_admin_id, student_id")
    .eq("student_id", studentId);
  const assignments = (assignmentRows ?? []) as AssignmentRow[];

  const [studentRow] = await fetchSlimStudentListRows(
    [studentId],
    [profile as ProfileRow],
    assignments,
  );
  if (!studentRow) return null;

  const { data: events } = await supabase
    .from("activity_events")
    .select("id, user_id, event_type, question_id, wrong_reason, created_at")
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(400);
  const eventRows = (events ?? []) as ActivityRow[];
  const weekly = buildDailyReviews(eventRows, 14);
  const reasonMap = new Map<string, number>();
  for (const row of eventRows) {
    if (!row.wrong_reason) continue;
    reasonMap.set(row.wrong_reason, (reasonMap.get(row.wrong_reason) ?? 0) + 1);
  }
  const topWeaknesses = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  let aiEngine: StudentDetailData["aiEngine"] = null;
  const { data: studentProfile } = await supabase
    .from("profiles")
    .select("academy_id, ai_prefer_gpt4o")
    .eq("id", studentId)
    .maybeSingle();
  if (studentProfile) {
    let academyPlanCode: string | null = null;
    if (studentProfile.academy_id) {
      const { data: sub } = await supabase
        .from("academy_subscriptions")
        .select("plan_id")
        .eq("academy_id", studentProfile.academy_id as string)
        .maybeSingle();
      if (sub?.plan_id) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("code")
          .eq("id", sub.plan_id)
          .maybeSingle();
        academyPlanCode = (plan?.code as string | null) ?? null;
      }
    }
    aiEngine = {
      academyPlanCode,
      preferGpt4o: studentProfile.ai_prefer_gpt4o === true,
    };
  }

  return {
    student: studentRow,
    weeklyReviews: weekly,
    topWeaknesses,
    aiEngine,
  };
}

async function staffCanAccessStudent(
  staffId: string,
  staffRole: "admin" | "sub_admin",
  studentId: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const [{ data: staff }, { data: student }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, academy_id")
      .eq("id", staffId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, role, academy_id, withdrawn_at")
      .eq("id", studentId)
      .maybeSingle(),
  ]);
  if (!staff || !student || student.role !== "student") return false;
  if (student.withdrawn_at) return false;
  if (
    !staff.academy_id ||
    !student.academy_id ||
    staff.academy_id !== student.academy_id
  ) {
    return false;
  }

  if (staffRole === "admin") {
    return staff.role === "admin" || staff.role === "sub_admin";
  }

  const [{ data: assignment }, { data: classTeacherRows }] = await Promise.all([
    supabase
      .from("student_assignments")
      .select("student_id")
      .eq("sub_admin_id", staffId)
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("class_room_teachers")
      .select("class_room_id")
      .eq("teacher_id", staffId),
  ]);
  if (assignment) return true;
  const classIds = (classTeacherRows ?? []).map((r) => r.class_room_id as string);
  if (classIds.length === 0) return false;
  const { data: membership } = await supabase
    .from("class_room_students")
    .select("student_id")
    .eq("student_id", studentId)
    .in("class_room_id", classIds)
    .limit(1)
    .maybeSingle();
  return Boolean(membership);
}

export async function getClassManagementData(
  adminId: string,
): Promise<ClassManagementData> {
  if (!isSupabaseEnabled() || !isServiceRoleConfigured() || !isSupabaseUserId(adminId)) {
    return { classes: [], students: [], teachers: [], teacherOverviews: [] };
  }

  const academyId = await getAdminAcademyId(adminId);
  if (!academyId) return { classes: [], students: [], teachers: [], teacherOverviews: [] };

  const supabase = createServiceClient();
  const [{ data: classRows }, { data: profiles }, { data: adminProfile }] =
    await Promise.all([
    supabase
      .from("class_rooms")
      .select("id, name, school_level, grade_number, image_url")
      .eq("academy_id", academyId)
      .order("school_level", { ascending: true })
      .order("grade_number", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name, username, role, school_level, grade_number, is_director, nickname, withdrawn_at")
      .eq("academy_id", academyId)
      .in("role", ["student", "sub_admin", "admin"]),
    supabase
      .from("profiles")
      .select("id, display_name, username, role, school_level, grade_number, is_director, nickname")
      .eq("id", adminId)
      .maybeSingle(),
  ]);

  const rooms = (classRows ?? []) as ClassRoomRow[];
  const classIds = rooms.map((room) => room.id);
  const profileList = (profiles ?? []) as ProfileRow[];
  if (
    adminProfile &&
    !profileList.some((p) => p.id === adminProfile.id)
  ) {
    profileList.push(adminProfile as ProfileRow);
  }

  const [{ data: teacherRows }, { data: studentRows }] =
    classIds.length > 0
      ? await Promise.all([
          supabase
            .from("class_room_teachers")
            .select("class_room_id, teacher_id")
            .in("class_room_id", classIds),
          supabase
            .from("class_room_students")
            .select("class_room_id, student_id")
            .in("class_room_id", classIds),
        ])
      : [{ data: [] }, { data: [] }];

  const profileMap = new Map(profileList.map((p) => [p.id, p]));
  const teachersByClass = new Map<string, string[]>();
  const teacherIdsByClass = new Map<string, string[]>();
  for (const row of teacherRows ?? []) {
    const teacher = profileMap.get(row.teacher_id);
    if (!teacher) continue;
    const name = formatStaffLabel({
      displayName: teacher.display_name,
      nickname: teacher.nickname,
      role: teacher.role,
      isDirector: teacher.is_director,
    });
    const names = teachersByClass.get(row.class_room_id) ?? [];
    names.push(name);
    teachersByClass.set(row.class_room_id, names);
    const ids = teacherIdsByClass.get(row.class_room_id) ?? [];
    ids.push(row.teacher_id);
    teacherIdsByClass.set(row.class_room_id, ids);
  }

  const studentsByClass = new Map<string, string[]>();
  for (const row of studentRows ?? []) {
    const ids = studentsByClass.get(row.class_room_id) ?? [];
    ids.push(row.student_id);
    studentsByClass.set(row.class_room_id, ids);
  }

  const classes: ClassRoomSummary[] = rooms.map((room) => {
    const studentIds = studentsByClass.get(room.id) ?? [];
    const students: ClassStudentBrief[] = studentIds
      .map((id): ClassStudentBrief | null => {
        const p = profileMap.get(id);
        if (!p || p.role !== "student") return null;
        return {
          id: p.id,
          displayName: p.display_name,
          username: p.username ?? "—",
          gradeLabel: toGradeLabel(p.school_level, p.grade_number),
          classIds: [] as string[],
          classLabels: [] as string[],
        };
      })
      .filter((s): s is ClassStudentBrief => Boolean(s))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

    return {
      id: room.id,
      name: room.name,
      schoolLevel: room.school_level,
      gradeNumber: room.grade_number,
      gradeLabel: toGradeLabel(room.school_level, room.grade_number),
      displayLabel: formatClassLabel(room.name, room.school_level, room.grade_number),
      imageUrl: room.image_url ?? null,
      teacherIds: teacherIdsByClass.get(room.id) ?? [],
      teacherNames: teachersByClass.get(room.id) ?? [],
      studentIds,
      students,
      studentCount: students.length,
    };
  });

  const classIdsByStudent = new Map<string, string[]>();
  const classLabelsByStudent = new Map<string, string[]>();
  for (const room of classes) {
    for (const studentId of room.studentIds) {
      const ids = classIdsByStudent.get(studentId) ?? [];
      ids.push(room.id);
      classIdsByStudent.set(studentId, ids);
      const labels = classLabelsByStudent.get(studentId) ?? [];
      labels.push(room.displayLabel);
      classLabelsByStudent.set(studentId, labels);
    }
  }

  for (const room of classes) {
    for (const student of room.students) {
      student.classIds = classIdsByStudent.get(student.id) ?? [];
      student.classLabels = classLabelsByStudent.get(student.id) ?? [];
    }
  }

  const students = profileList
    .filter((p) => p.role === "student" && !p.withdrawn_at)
    .map((p) => ({
      id: p.id,
      displayName: p.display_name,
      username: p.username ?? "—",
      gradeLabel: toGradeLabel(p.school_level, p.grade_number),
      classIds: classIdsByStudent.get(p.id) ?? [],
      classLabels: classLabelsByStudent.get(p.id) ?? [],
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

  const teachers = profileList
    .filter((p) => (p.role === "sub_admin" || p.role === "admin") && !p.withdrawn_at)
    .map((p) => ({
      id: p.id,
      displayName: formatStaffLabel({
        displayName: p.display_name,
        nickname: p.nickname,
        role: p.role,
        isDirector: p.is_director || p.role === "admin",
      }),
      isDirector: p.role === "admin" || Boolean(p.is_director),
    }))
    .sort((a, b) => {
      if (a.isDirector !== b.isDirector) return a.isDirector ? -1 : 1;
      return a.displayName.localeCompare(b.displayName, "ko");
    });

  const teacherOverviews: TeacherClassOverview[] = teachers.map((teacher) => {
    const ownedClasses = classes.filter((c) => c.teacherIds.includes(teacher.id));
    const studentNameSet = new Set<string>();
    for (const room of ownedClasses) {
      for (const student of room.students) {
        studentNameSet.add(student.displayName);
      }
    }
    return {
      id: teacher.id,
      displayName: teacher.displayName,
      classIds: ownedClasses.map((c) => c.id),
      classLabels: ownedClasses.map((c) => c.displayLabel),
      studentCount: studentNameSet.size,
      studentNames: Array.from(studentNameSet).sort((a, b) => a.localeCompare(b, "ko")),
    };
  });

  return { classes, students, teachers, teacherOverviews };
}

/** 반 선택용 — class_rooms만 (반 관리 풀데이터 불필요) */
export async function getAdminClassOptions(
  adminId: string,
): Promise<ClassOption[]> {
  if (
    !isSupabaseEnabled() ||
    !isServiceRoleConfigured() ||
    !isSupabaseUserId(adminId)
  ) {
    return [];
  }
  const academyId = await getAdminAcademyId(adminId);
  if (!academyId) return [];

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("class_rooms")
    .select("id, name, school_level, grade_number")
    .eq("academy_id", academyId)
    .order("school_level", { ascending: true })
    .order("grade_number", { ascending: true })
    .order("name", { ascending: true });

  return ((data ?? []) as ClassRoomRow[]).map((room) => {
    const gradeLabel = toGradeLabel(room.school_level, room.grade_number);
    const displayLabel = formatClassLabel(
      room.name,
      room.school_level,
      room.grade_number,
    );
    return {
      id: room.id,
      displayLabel,
      gradeLabel,
      name: room.name,
    };
  });
}

type SlimQuestionCountRow = { user_id: string };
type SlimDueRow = { user_id: string };
type SlimReviewRow = { user_id: string };

/**
 * 학생 설정 목록용 — questions/activity 전 이력을 끌어오지 않고
 * 등록 수·오늘 할 것·오늘 품·최근 로그인만 집계한다.
 */
async function fetchSlimStudentListRows(
  studentIds: string[],
  profiles: ProfileRow[],
  assignments: AssignmentRow[],
): Promise<AdminStudentRow[]> {
  if (studentIds.length === 0) return [];

  const supabase = createServiceClient();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const assignmentByStudent = new Map(
    assignments.map((a) => [a.student_id, a.sub_admin_id]),
  );

  const loginSince = new Date(
    Date.now() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todayStart = startOfTodayKstIso();
  const todayEndIso = endOfDay(new Date()).toISOString();

  const [
    { data: questionIdRows },
    { data: dueRows },
    { data: reviewRows },
    { data: loginRows },
    { data: classStudentsRows },
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("user_id")
      .in("user_id", studentIds)
      .eq("archived", false),
    supabase
      .from("questions")
      .select("user_id")
      .in("user_id", studentIds)
      .eq("archived", false)
      .neq("phase", "completed")
      .lte("next_review_date", todayEndIso),
    supabase
      .from("activity_events")
      .select("user_id")
      .in("user_id", studentIds)
      .eq("event_type", "reviewed")
      .gte("created_at", todayStart),
    supabase
      .from("login_events")
      .select("user_id, logged_in_at")
      .in("user_id", studentIds)
      .gte("logged_in_at", loginSince)
      .order("logged_in_at", { ascending: false }),
    supabase
      .from("class_room_students")
      .select(
        "student_id, class_room_id, class_rooms(name, school_level, grade_number)",
      )
      .in("student_id", studentIds),
  ]);

  const registeredCount = new Map<string, number>();
  for (const row of (questionIdRows ?? []) as SlimQuestionCountRow[]) {
    registeredCount.set(
      row.user_id,
      (registeredCount.get(row.user_id) ?? 0) + 1,
    );
  }

  const dueCount = new Map<string, number>();
  for (const row of (dueRows ?? []) as SlimDueRow[]) {
    dueCount.set(row.user_id, (dueCount.get(row.user_id) ?? 0) + 1);
  }

  const reviewedCount = new Map<string, number>();
  for (const row of (reviewRows ?? []) as SlimReviewRow[]) {
    reviewedCount.set(
      row.user_id,
      (reviewedCount.get(row.user_id) ?? 0) + 1,
    );
  }

  const lastLoginMap = new Map<string, string>();
  const loginByStudent = new Map<string, LoginRow[]>();
  for (const row of (loginRows ?? []) as LoginRow[]) {
    if (!lastLoginMap.has(row.user_id)) {
      lastLoginMap.set(row.user_id, row.logged_in_at);
    }
    const arr = loginByStudent.get(row.user_id) ?? [];
    arr.push(row);
    loginByStudent.set(row.user_id, arr);
  }

  const classStudents = (classStudentsRows ?? []) as unknown as ClassStudentRow[];
  const classRoomIds = Array.from(
    new Set(classStudents.map((row) => row.class_room_id)),
  );
  const classTeachers: ClassTeacherRow[] =
    classRoomIds.length > 0
      ? (
          (
            await supabase
              .from("class_room_teachers")
              .select("class_room_id, teacher_id")
              .in("class_room_id", classRoomIds)
          ).data ?? []
        )
      : [];

  const missingTeacherIds = missingStaffProfileIds(
    profileMap.keys(),
    [
      ...classTeachers.map((ct) => ct.teacher_id),
      ...assignments.map((assignment) => assignment.sub_admin_id),
    ],
  );
  if (missingTeacherIds.length > 0) {
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select(
        "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname",
      )
      .in("id", missingTeacherIds);
    for (const row of (teacherProfiles ?? []) as ProfileRow[]) {
      profileMap.set(row.id, row);
    }
  }

  const classByStudent = new Map<string, ClassStudentRow[]>();
  for (const row of classStudents) {
    const arr = classByStudent.get(row.student_id) ?? [];
    arr.push(row);
    classByStudent.set(row.student_id, arr);
  }

  const teacherNamesByClass = new Map<string, string[]>();
  for (const ct of classTeachers) {
    const teacher = profileMap.get(ct.teacher_id);
    if (!teacher) continue;
    const name = formatStaffLabel({
      displayName: teacher.display_name,
      nickname: teacher.nickname,
      role: teacher.role,
      isDirector: teacher.is_director,
    });
    const arr = teacherNamesByClass.get(ct.class_room_id) ?? [];
    arr.push(name);
    teacherNamesByClass.set(ct.class_room_id, arr);
  }

  return studentIds
    .map((id) => {
      const profile = profileMap.get(id);
      if (!profile) return null;

      const subAdminId = assignmentByStudent.get(id) ?? null;
      const subAdmin = subAdminId ? profileMap.get(subAdminId) : null;
      const classRows = classByStudent.get(id) ?? [];
      const classNames = classRows
        .map((row) => {
          if (!row.class_rooms?.name) return null;
          return formatClassLabel(
            row.class_rooms.name,
            row.class_rooms.school_level,
            row.class_rooms.grade_number,
          );
        })
        .filter((name): name is string => Boolean(name));
      const className = classNames.length > 0 ? classNames.join(", ") : null;

      const teacherNameSet = new Set<string>();
      for (const classRow of classRows) {
        for (const name of teacherNamesByClass.get(classRow.class_room_id) ??
          []) {
          teacherNameSet.add(name);
        }
      }
      const teacherNames = [...teacherNameSet];
      if (subAdmin && teacherNames.length === 0) {
        teacherNames.push(
          formatStaffLabel({
            displayName: subAdmin.display_name,
            nickname: subAdmin.nickname,
            role: subAdmin.role,
            isDirector: subAdmin.is_director,
          }),
        );
      }

      const lastLogin = lastLoginMap.get(id) ?? null;
      return {
        id,
        displayName: profile.display_name,
        username: profile.username ?? "—",
        phone: profile.phone ?? null,
        schoolLevel: profile.school_level,
        gradeNumber: profile.grade_number,
        gradeLabel: toGradeLabel(profile.school_level, profile.grade_number),
        className,
        classNames,
        teacherNames,
        subAdminName: subAdmin?.display_name ?? null,
        subAdminId,
        lastLoginAt: lastLogin,
        totalRegistered: registeredCount.get(id) ?? 0,
        totalReviews: 0,
        loginStreakDays: calcLoginStreakDays(loginByStudent.get(id) ?? []),
        inactiveDays: calcInactiveDays(lastLogin),
        dueToday: dueCount.get(id) ?? 0,
        reviewedToday: reviewedCount.get(id) ?? 0,
      } satisfies AdminStudentRow;
    })
    .filter((row): row is AdminStudentRow => Boolean(row))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

export async function getAdminStudentList(
  adminId: string,
): Promise<AdminStudentRow[]> {
  if (
    !isSupabaseEnabled() ||
    !isServiceRoleConfigured() ||
    !isSupabaseUserId(adminId)
  ) {
    return demoDashboard().students;
  }

  const academyId = await getAdminAcademyId(adminId);
  const supabase = createServiceClient();

  let profilesQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname, withdrawn_at",
    )
    .eq("role", "student");
  if (academyId) {
    profilesQuery = profilesQuery.eq("academy_id", academyId);
  }

  const [{ data: rawProfiles }, { data: assignmentRows }, { data: staffRows }] =
    await Promise.all([
      profilesQuery,
      academyId
        ? supabase
            .from("student_assignments")
            .select("sub_admin_id, student_id")
            .eq("academy_id", academyId)
        : supabase.from("student_assignments").select("sub_admin_id, student_id"),
      academyId
        ? supabase
            .from("profiles")
            .select(
              "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname",
            )
            .eq("academy_id", academyId)
            .in("role", ["sub_admin", "admin"])
        : Promise.resolve({ data: [] as ProfileRow[] }),
    ]);

  const students = ((rawProfiles ?? []) as ProfileRow[]).filter(
    (p) => !p.withdrawn_at,
  );
  const staff = (staffRows ?? []) as ProfileRow[];
  const profiles = [...students, ...staff];
  const studentIds = students.map((p) => p.id);
  const assignments = (assignmentRows ?? []) as AssignmentRow[];

  return fetchSlimStudentListRows(studentIds, profiles, assignments);
}

export async function getSubAdminStudentList(
  subAdminId: string,
): Promise<AdminStudentRow[]> {
  if (
    !isSupabaseEnabled() ||
    !isServiceRoleConfigured() ||
    !isSupabaseUserId(subAdminId)
  ) {
    return demoDashboard().students;
  }

  const supabase = createServiceClient();
  const [{ data: assignmentRows }, { data: classTeacherRows }] =
    await Promise.all([
      supabase
        .from("student_assignments")
        .select("sub_admin_id, student_id")
        .eq("sub_admin_id", subAdminId),
      supabase
        .from("class_room_teachers")
        .select("class_room_id")
        .eq("teacher_id", subAdminId),
    ]);

  const assignments = (assignmentRows ?? []) as AssignmentRow[];
  const classRoomIds = (classTeacherRows ?? []).map((row) => row.class_room_id);

  let classStudentIds: string[] = [];
  if (classRoomIds.length > 0) {
    const { data: classStudentRows } = await supabase
      .from("class_room_students")
      .select("student_id")
      .in("class_room_id", classRoomIds);
    classStudentIds = (classStudentRows ?? []).map((row) => row.student_id);
  }

  const studentIds = Array.from(
    new Set([...assignments.map((a) => a.student_id), ...classStudentIds]),
  );
  if (studentIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, academy_id, phone, school_level, grade_number, is_director, nickname, withdrawn_at",
    )
    .in("id", [...studentIds, subAdminId]);

  const profileList = ((profiles ?? []) as ProfileRow[]).filter(
    (p) => p.role !== "student" || !p.withdrawn_at,
  );
  const activeStudentIds = profileList
    .filter((p) => p.role === "student")
    .map((p) => p.id);

  return fetchSlimStudentListRows(activeStudentIds, profileList, assignments);
}
