import { createServiceClient } from "@/lib/supabase/service";
import {
  getWeekStart,
  startOfTodayKstIso,
  toDateKey,
} from "@/lib/utils/date-range";

export type PlatformDirectorRow = {
  userId: string;
  displayName: string;
  username: string;
  phone: string | null;
  recoveryEmail: string | null;
  academyId: string;
  academyName: string;
  academyCode: string;
  academyStatus: string;
  studentCount: number;
  joinedAt: string;
  lastLoginAt: string | null;
};

export type PlatformAcademyOpsRow = {
  academyId: string;
  academyName: string;
  academyCode: string;
  status: string;
  createdAt: string;
  studentCount: number;
  activeStudentCount: number;
  staffCount: number;
  classCount: number;
  directorName: string | null;
  directorUsername: string | null;
  directorLastLoginAt: string | null;
  activeQuestions: number;
  questionsAddedThisMonth: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  activeStudentsToday: number;
  lastStudentActivityAt: string | null;
  aiCallsThisMonth: number;
  aiCostKrwThisMonth: number;
};

export type PlatformOperationsOverview = {
  directors: PlatformDirectorRow[];
  academies: PlatformAcademyOpsRow[];
  totals: {
    academyCount: number;
    directorCount: number;
    studentCount: number;
    activeStudentsToday: number;
    reviewsToday: number;
  };
};

function startOfKstMonthIso(now = new Date()): string {
  const key = toDateKey(now);
  return new Date(`${key.slice(0, 7)}-01T00:00:00+09:00`).toISOString();
}

function bumpMap(map: Map<string, number>, key: string, delta = 1) {
  map.set(key, (map.get(key) ?? 0) + delta);
}

function maxIso(a: string | null, b: string): string {
  if (!a) return b;
  return a >= b ? a : b;
}

/** owner — 원장 계정·학원별 운영 지표 */
export async function getPlatformOperationsOverview(): Promise<PlatformOperationsOverview> {
  const supabase = createServiceClient();
  const todayStart = startOfTodayKstIso();
  const weekStart = getWeekStart().toISOString();
  const monthStart = startOfKstMonthIso();

  const { data: academies } = await supabase
    .from("academies")
    .select("id, name, code, status, created_at")
    .order("created_at", { ascending: false });

  if (!academies?.length) {
    return {
      directors: [],
      academies: [],
      totals: {
        academyCount: 0,
        directorCount: 0,
        studentCount: 0,
        activeStudentsToday: 0,
        reviewsToday: 0,
      },
    };
  }

  const academyIds = academies.map((a) => a.id as string);
  const academyById = new Map(
    academies.map((a) => [
      a.id as string,
      {
        name: a.name as string,
        code: (a.code as string | null) ?? "",
        status: (a.status as string | null) ?? "active",
        createdAt: a.created_at as string,
      },
    ]),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, academy_id, role, display_name, username, phone, recovery_email, is_director, withdrawn_at, created_at",
    )
    .in("academy_id", academyIds);

  const members = profiles ?? [];
  const students = members.filter((p) => p.role === "student");
  const activeStudents = students.filter((p) => !p.withdrawn_at);
  const studentIds = activeStudents.map((p) => p.id as string);
  const studentAcademy = new Map(
    activeStudents.map((p) => [p.id as string, p.academy_id as string]),
  );

  const directors = members.filter(
    (p) => p.role === "admin" && p.is_director,
  );
  const directorIds = directors.map((p) => p.id as string);

  const staffCountByAcademy = new Map<string, number>();
  const studentCountByAcademy = new Map<string, number>();
  const activeStudentCountByAcademy = new Map<string, number>();

  for (const p of members) {
    const aid = p.academy_id as string | null;
    if (!aid) continue;
    if (p.role === "student") {
      bumpMap(studentCountByAcademy, aid);
      if (!p.withdrawn_at) bumpMap(activeStudentCountByAcademy, aid);
    } else if (p.role === "sub_admin") {
      bumpMap(staffCountByAcademy, aid);
    }
  }

  const directorByAcademy = new Map<
    string,
    (typeof directors)[number]
  >();
  for (const d of directors) {
    const aid = d.academy_id as string;
    if (!directorByAcademy.has(aid)) directorByAcademy.set(aid, d);
  }

  const [
    { data: classRows },
    { data: questionRows },
    { data: directorLoginRows },
    { data: todayLoginRows },
    { data: weekReviewRows },
    { data: todayReviewRows },
    { data: recentActivityRows },
    { data: aiCostRows },
  ] = await Promise.all([
    supabase.from("class_rooms").select("id, academy_id").in("academy_id", academyIds),
    supabase
      .from("questions")
      .select("academy_id, archived, created_at")
      .in("academy_id", academyIds),
    directorIds.length > 0
      ? supabase
          .from("login_events")
          .select("user_id, logged_in_at")
          .in("user_id", directorIds)
          .order("logged_in_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as { user_id: string; logged_in_at: string }[] }),
    studentIds.length > 0
      ? supabase
          .from("login_events")
          .select("user_id, logged_in_at")
          .in("user_id", studentIds)
          .gte("logged_in_at", todayStart)
      : Promise.resolve({ data: [] as { user_id: string; logged_in_at: string }[] }),
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("user_id, created_at")
          .in("user_id", studentIds)
          .eq("event_type", "reviewed")
          .gte("created_at", weekStart)
      : Promise.resolve({ data: [] as { user_id: string; created_at: string }[] }),
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("user_id, created_at")
          .in("user_id", studentIds)
          .eq("event_type", "reviewed")
          .gte("created_at", todayStart)
      : Promise.resolve({ data: [] as { user_id: string; created_at: string }[] }),
    studentIds.length > 0
      ? supabase
          .from("activity_events")
          .select("user_id, created_at")
          .in("user_id", studentIds)
          .order("created_at", { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [] as { user_id: string; created_at: string }[] }),
    supabase
      .from("ai_cost_logs")
      .select("academy_id, estimated_cost_krw, created_at")
      .in("academy_id", academyIds)
      .gte("created_at", monthStart),
  ]);

  const classCountByAcademy = new Map<string, number>();
  for (const row of classRows ?? []) {
    bumpMap(classCountByAcademy, row.academy_id as string);
  }

  const activeQuestionsByAcademy = new Map<string, number>();
  const questionsThisMonthByAcademy = new Map<string, number>();
  for (const row of questionRows ?? []) {
    const aid = row.academy_id as string | null;
    if (!aid) continue;
    if (!row.archived) bumpMap(activeQuestionsByAcademy, aid);
    if (String(row.created_at) >= monthStart) {
      bumpMap(questionsThisMonthByAcademy, aid);
    }
  }

  const lastLoginByUser = new Map<string, string>();
  for (const row of directorLoginRows ?? []) {
    const uid = row.user_id as string;
    if (!lastLoginByUser.has(uid)) {
      lastLoginByUser.set(uid, row.logged_in_at as string);
    }
  }

  const reviewsTodayByAcademy = new Map<string, number>();
  const reviewsWeekByAcademy = new Map<string, number>();
  const activeTodayByAcademy = new Map<string, Set<string>>();
  const lastActivityByAcademy = new Map<string, string>();

  for (const row of todayLoginRows ?? []) {
    const uid = row.user_id as string;
    const aid = studentAcademy.get(uid);
    if (!aid) continue;
    if (!activeTodayByAcademy.has(aid)) activeTodayByAcademy.set(aid, new Set());
    activeTodayByAcademy.get(aid)!.add(uid);
  }

  for (const row of todayReviewRows ?? []) {
    const uid = row.user_id as string;
    const aid = studentAcademy.get(uid);
    if (!aid) continue;
    bumpMap(reviewsTodayByAcademy, aid);
    if (!activeTodayByAcademy.has(aid)) activeTodayByAcademy.set(aid, new Set());
    activeTodayByAcademy.get(aid)!.add(uid);
  }

  for (const row of weekReviewRows ?? []) {
    const uid = row.user_id as string;
    const aid = studentAcademy.get(uid);
    if (!aid) continue;
    bumpMap(reviewsWeekByAcademy, aid);
  }

  for (const row of recentActivityRows ?? []) {
    const uid = row.user_id as string;
    const aid = studentAcademy.get(uid);
    if (!aid) continue;
    const at = row.created_at as string;
    lastActivityByAcademy.set(
      aid,
      maxIso(lastActivityByAcademy.get(aid) ?? null, at),
    );
  }

  const aiCallsByAcademy = new Map<string, number>();
  const aiCostByAcademy = new Map<string, number>();
  for (const row of aiCostRows ?? []) {
    const aid = row.academy_id as string | null;
    if (!aid) continue;
    bumpMap(aiCallsByAcademy, aid);
    aiCostByAcademy.set(
      aid,
      (aiCostByAcademy.get(aid) ?? 0) + Number(row.estimated_cost_krw ?? 0),
    );
  }

  const directorRows: PlatformDirectorRow[] = directors.map((d) => {
    const aid = d.academy_id as string;
    const academy = academyById.get(aid)!;
    return {
      userId: d.id as string,
      displayName: (d.display_name as string | null) ?? "—",
      username: (d.username as string | null) ?? "—",
      phone: (d.phone as string | null) ?? null,
      recoveryEmail: (d.recovery_email as string | null) ?? null,
      academyId: aid,
      academyName: academy.name,
      academyCode: academy.code,
      academyStatus: academy.status,
      studentCount: activeStudentCountByAcademy.get(aid) ?? 0,
      joinedAt: d.created_at as string,
      lastLoginAt: lastLoginByUser.get(d.id as string) ?? null,
    };
  });

  directorRows.sort((a, b) => {
    const aLogin = a.lastLoginAt ?? "";
    const bLogin = b.lastLoginAt ?? "";
    return bLogin.localeCompare(aLogin);
  });

  const academyOpsRows: PlatformAcademyOpsRow[] = academies.map((academy) => {
    const id = academy.id as string;
    const meta = academyById.get(id)!;
    const director = directorByAcademy.get(id);
    const directorId = director?.id as string | undefined;

    return {
      academyId: id,
      academyName: meta.name,
      academyCode: meta.code,
      status: meta.status,
      createdAt: meta.createdAt,
      studentCount: studentCountByAcademy.get(id) ?? 0,
      activeStudentCount: activeStudentCountByAcademy.get(id) ?? 0,
      staffCount: staffCountByAcademy.get(id) ?? 0,
      classCount: classCountByAcademy.get(id) ?? 0,
      directorName: (director?.display_name as string | null) ?? null,
      directorUsername: (director?.username as string | null) ?? null,
      directorLastLoginAt: directorId
        ? (lastLoginByUser.get(directorId) ?? null)
        : null,
      activeQuestions: activeQuestionsByAcademy.get(id) ?? 0,
      questionsAddedThisMonth: questionsThisMonthByAcademy.get(id) ?? 0,
      reviewsToday: reviewsTodayByAcademy.get(id) ?? 0,
      reviewsThisWeek: reviewsWeekByAcademy.get(id) ?? 0,
      activeStudentsToday: activeTodayByAcademy.get(id)?.size ?? 0,
      lastStudentActivityAt: lastActivityByAcademy.get(id) ?? null,
      aiCallsThisMonth: aiCallsByAcademy.get(id) ?? 0,
      aiCostKrwThisMonth: Math.round((aiCostByAcademy.get(id) ?? 0) * 10) / 10,
    };
  });

  academyOpsRows.sort((a, b) => b.activeStudentsToday - a.activeStudentsToday);

  let totalActiveToday = 0;
  let totalReviewsToday = 0;
  let totalStudents = 0;
  for (const row of academyOpsRows) {
    totalActiveToday += row.activeStudentsToday;
    totalReviewsToday += row.reviewsToday;
    totalStudents += row.activeStudentCount;
  }

  return {
    directors: directorRows,
    academies: academyOpsRows,
    totals: {
      academyCount: academies.length,
      directorCount: directorRows.length,
      studentCount: totalStudents,
      activeStudentsToday: totalActiveToday,
      reviewsToday: totalReviewsToday,
    },
  };
}
