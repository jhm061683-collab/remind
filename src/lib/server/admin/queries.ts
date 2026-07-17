import type { ReviewPhase } from "@/types/subject";
import type { ActivityEvent } from "@/lib/types/activity";
import { toGradeLabel } from "@/lib/admin/grade";
import { computePromotedGrade } from "@/lib/admin/grade";
import { formatClassLabel } from "@/lib/admin/class-label";
import type { StoredQuestion } from "@/lib/storage/questions";
import { computeUserStats } from "@/lib/stats/compute";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/supabase/service";
import { isSupabaseEnabled, isSupabaseUserId } from "@/lib/supabase/config";
import { DEMO_USERS } from "@/lib/auth/users";
import { getAdminVisiblePasswords } from "@/lib/server/admin/password-notes";
import type {
  AdminDashboardData,
  AdminStudentRow,
  ClassManagementData,
  ClassRoomSummary,
  ClassStudentBrief,
  DailyActivity,
  PromotionRule,
  StudentDetailData,
  SubAdminRow,
  TeacherClassOverview,
} from "@/lib/types/admin";

type ProfileRow = {
  id: string;
  display_name: string;
  username: string | null;
  role: string;
  academy_id: string | null;
  phone: string | null;
  school_level: "elementary" | "middle" | "high" | "adult" | null;
  grade_number: number | null;
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

function toDateKey(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function calcLoginStreakDays(logins: LoginRow[]): number {
  if (logins.length === 0) return 0;
  const uniqueDays = Array.from(new Set(logins.map((l) => toDateKey(l.logged_in_at))));
  uniqueDays.sort((a, b) => (a > b ? -1 : 1));
  const now = new Date();
  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  for (const day of uniqueDays) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function calcInactiveDays(lastLoginAt: string | null): number {
  if (!lastLoginAt) return 999;
  const last = new Date(lastLoginAt);
  const now = new Date();
  last.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)));
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isToday(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ko-KR", {
      month: "numeric",
      day: "numeric",
    });
    const count = events.filter(
      (e) =>
        e.event_type === "reviewed" && e.created_at.slice(0, 10) === key,
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
    passwordPlain: "student123",
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
  const assignmentByStudent = new Map(
    assignments.map((a) => [a.student_id, a.sub_admin_id]),
  );

  const [
    { data: allLoginRows },
    { data: questionRows },
    { data: activityRows },
    { data: classStudentsRows },
  ] = await Promise.all([
    studentIds.length > 0
      ? supabase
          .from("login_events")
          .select("user_id, logged_in_at")
          .in("user_id", studentIds)
          .order("logged_in_at", { ascending: false })
      : Promise.resolve({ data: [] as LoginRow[] }),
    studentIds.length > 0
      ? supabase
          .from("questions")
          .select(
            "id, user_id, phase, next_review_date, last_answered_at, archived, created_at, wrong_reason",
          )
          .in("user_id", studentIds)
      : Promise.resolve({ data: [] as QuestionRow[] }),
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("id, user_id, event_type, question_id, wrong_reason, created_at")
          .in("user_id", studentIds)
      : Promise.resolve({ data: [] as ActivityRow[] }),
    studentIds.length > 0
      ? supabase
          .from("class_room_students")
          .select("student_id, class_room_id, class_rooms(name, school_level, grade_number)")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] as ClassStudentRow[] }),
  ]);

  const questions = (questionRows ?? []) as QuestionRow[];
  const activities = (activityRows ?? []) as ActivityRow[];
  const allLogins = (allLoginRows ?? []) as LoginRow[];
  const classStudents = (classStudentsRows ?? []) as ClassStudentRow[];
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

  const loggedInToday = new Set(
    allLogins.filter((l) => isToday(l.logged_in_at)).map((l) => l.user_id),
  ).size;
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
    const name = profileMap.get(ct.teacher_id)?.display_name;
    if (!name) continue;
    const arr = teacherNamesByClass.get(ct.class_room_id) ?? [];
    arr.push(name);
    teacherNamesByClass.set(ct.class_room_id, arr);
  }

  const students: AdminStudentRow[] = studentIds.map((id) => {
    const userQuestions = questionsByUser.get(id) ?? [];
    const userEvents = (activityByUser.get(id) ?? []).map(rowToEvent);
    const stats = computeUserStats(userQuestions, userEvents);
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
    if (subAdmin?.display_name && teacherNames.length === 0) {
      teacherNames.push(subAdmin.display_name);
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
      totalRegistered: stats.totalRegistered,
      totalReviews: stats.totalReviews,
      loginStreakDays: calcLoginStreakDays(loginsForStudent),
      inactiveDays: calcInactiveDays(lastLogin),
      dueToday,
      reviewedToday,
      passwordPlain: null,
    };
  });

  const passwordMap = await getAdminVisiblePasswords(studentIds);
  for (const student of students) {
    student.passwordPlain = passwordMap.get(student.id) ?? null;
  }

  const subAdmins: SubAdminRow[] = subAdminProfiles.map((p) => ({
    id: p.id,
    displayName: p.display_name,
    username: p.username ?? "—",
    assignedCount: assignments.filter((a) => a.sub_admin_id === p.id).length,
  }));

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

  const { data: rawProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, username, role, academy_id, phone, school_level, grade_number")
    .in("role", ["student", "sub_admin"]);

  const allProfiles = ((rawProfiles ?? []) as ProfileRow[]).filter(
    (p) => !academyId || !p.academy_id || p.academy_id === academyId,
  );
  const studentIds = allProfiles
    .filter((p) => p.role === "student")
    .map((p) => p.id);

  const { data: assignmentRows, error: assignError } = await supabase
    .from("student_assignments")
    .select("sub_admin_id, student_id");

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
    .select("id, display_name, username, role, academy_id, phone, school_level, grade_number")
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
  const dashboard =
    staffRole === "admin"
      ? await getAdminDashboard(staffId)
      : await getSubAdminDashboard(staffId);
  const student = dashboard.students.find((s) => s.id === studentId);
  if (!student) return null;
  const supabase = createServiceClient();
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
  return {
    student,
    weeklyReviews: weekly,
    topWeaknesses,
  };
}

export async function getClassManagementData(
  adminId: string,
): Promise<ClassManagementData> {
  if (!isSupabaseEnabled() || !isServiceRoleConfigured() || !isSupabaseUserId(adminId)) {
    return { classes: [], students: [], teachers: [] };
  }

  const academyId = await getAdminAcademyId(adminId);
  if (!academyId) return { classes: [], students: [], teachers: [] };

  const supabase = createServiceClient();
  const [{ data: classRows }, { data: profiles }] = await Promise.all([
    supabase
      .from("class_rooms")
      .select("id, name, school_level, grade_number")
      .eq("academy_id", academyId)
      .order("school_level", { ascending: true })
      .order("grade_number", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name, username, role, school_level, grade_number")
      .eq("academy_id", academyId)
      .in("role", ["student", "sub_admin"]),
  ]);

  const rooms = (classRows ?? []) as ClassRoomRow[];
  const classIds = rooms.map((room) => room.id);
  const profileList = (profiles ?? []) as ProfileRow[];

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
    const name = profileMap.get(row.teacher_id)?.display_name;
    if (name) {
      const names = teachersByClass.get(row.class_room_id) ?? [];
      names.push(name);
      teachersByClass.set(row.class_room_id, names);
    }
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
      .map((id) => {
        const p = profileMap.get(id);
        if (!p || p.role !== "student") return null;
        return {
          id: p.id,
          displayName: p.display_name,
          username: p.username ?? "—",
          gradeLabel: toGradeLabel(p.school_level, p.grade_number),
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
      teacherIds: teacherIdsByClass.get(room.id) ?? [],
      teacherNames: teachersByClass.get(room.id) ?? [],
      studentIds,
      students,
      studentCount: students.length,
    };
  });

  const students = profileList
    .filter((p) => p.role === "student")
    .map((p) => ({
      id: p.id,
      displayName: p.display_name,
      username: p.username ?? "—",
      gradeLabel: toGradeLabel(p.school_level, p.grade_number),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

  const teachers = profileList
    .filter((p) => p.role === "sub_admin")
    .map((p) => ({ id: p.id, displayName: p.display_name }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));

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
