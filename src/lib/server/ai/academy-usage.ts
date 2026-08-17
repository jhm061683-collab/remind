import { toGradeLabel } from "@/lib/admin/grade";
import { createServiceClient } from "@/lib/supabase/service";
import { toDateKey } from "@/lib/utils/date-range";

export type AcademyAiQuotaSummary = {
  planCode: string;
  studentCount: number;
  monthlyUsed: number;
  monthlyLimitTotal: number;
  monthlyRemaining: number;
  goldUsed: number;
  goldLimitTotal: number;
  goldRemaining: number;
  usageMonth: string;
  byGrade: Array<{ gradeLabel: string; used: number; goldUsed: number }>;
  byClass: Array<{
    classId: string;
    className: string;
    gradeLabel: string | null;
    used: number;
    goldUsed: number;
  }>;
  byStudent: Array<{
    studentId: string;
    displayName: string;
    gradeLabel: string | null;
    className: string | null;
    used: number;
    goldUsed: number;
  }>;
  gradeRanking: Array<{ gradeLabel: string; used: number }>;
  classRanking: Array<{ className: string; used: number }>;
};

/**
 * 학원 소속 학생들의 이번 달 AI 사용량을 합산한다.
 * (학생당 월한도 × 인원 = 학원 전체 한도 추정치)
 */
export async function getAcademyAiQuotaSummary(
  academyId: string,
): Promise<AcademyAiQuotaSummary | null> {
  const supabase = createServiceClient();

  const { data: sub } = await supabase
    .from("academy_subscriptions")
    .select("plan_id")
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!sub?.plan_id) return null;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("code, ai_monthly_limit, ai_gold_monthly_limit")
    .eq("id", sub.plan_id)
    .maybeSingle();
  if (!plan) return null;

  const perStudentMonthly = Number(plan.ai_monthly_limit ?? 0);
  const perStudentGold = Number(plan.ai_gold_monthly_limit ?? 0);
  if (perStudentMonthly <= 0) return null;

  const { data: students } = await supabase
    .from("profiles")
    .select("id, display_name, school_level, grade_number")
    .eq("academy_id", academyId)
    .eq("role", "student")
    .is("withdrawn_at", null);
  const studentRows = students ?? [];
  const studentIds = studentRows.map((s) => s.id as string);
  const studentCount = studentIds.length;

  const today = toDateKey(new Date());
  const usageMonth = `${today.slice(0, 7)}-01`;

  const usageByUser = new Map<string, { used: number; gold: number }>();
  let monthlyUsed = 0;
  let goldUsed = 0;
  if (studentIds.length > 0) {
    const { data: usageRows } = await supabase
      .from("ai_usage_monthly")
      .select("user_id, used_count, gold_used_count")
      .eq("usage_month", usageMonth)
      .in("user_id", studentIds);
    for (const row of usageRows ?? []) {
      const used = Number(row.used_count ?? 0);
      const gold = Number(row.gold_used_count ?? 0);
      usageByUser.set(row.user_id as string, { used, gold });
      monthlyUsed += used;
      goldUsed += gold;
    }
  }

  const classByStudent = new Map<
    string,
    { classId: string; className: string; gradeLabel: string | null }
  >();
  if (studentIds.length > 0) {
    const { data: memberships } = await supabase
      .from("class_room_students")
      .select(
        "student_id, class_rooms(id, name, school_level, grade_number, academy_id)",
      )
      .in("student_id", studentIds);
    for (const row of memberships ?? []) {
      const raw = row.class_rooms as unknown;
      const room = (Array.isArray(raw) ? raw[0] : raw) as {
        id: string;
        name: string;
        school_level: "elementary" | "middle" | "high" | "adult" | null;
        grade_number: number | null;
        academy_id: string;
      } | null;
      if (!room || room.academy_id !== academyId) continue;
      if (classByStudent.has(row.student_id as string)) continue;
      classByStudent.set(row.student_id as string, {
        classId: room.id,
        className: room.name,
        gradeLabel: toGradeLabel(room.school_level, room.grade_number),
      });
    }
  }

  const gradeMap = new Map<string, { used: number; goldUsed: number }>();
  const classMap = new Map<
    string,
    {
      className: string;
      gradeLabel: string | null;
      used: number;
      goldUsed: number;
    }
  >();
  const byStudent: AcademyAiQuotaSummary["byStudent"] = [];

  for (const student of studentRows) {
    const id = student.id as string;
    const usage = usageByUser.get(id) ?? { used: 0, gold: 0 };
    const gradeLabel =
      toGradeLabel(
        student.school_level as "elementary" | "middle" | "high" | "adult" | null,
        student.grade_number as number | null,
      ) ?? "학년 미설정";
    const cls = classByStudent.get(id);
    const g = gradeMap.get(gradeLabel) ?? { used: 0, goldUsed: 0 };
    g.used += usage.used;
    g.goldUsed += usage.gold;
    gradeMap.set(gradeLabel, g);

    if (cls) {
      const c = classMap.get(cls.classId) ?? {
        className: cls.className,
        gradeLabel: cls.gradeLabel ?? gradeLabel,
        used: 0,
        goldUsed: 0,
      };
      c.used += usage.used;
      c.goldUsed += usage.gold;
      classMap.set(cls.classId, c);
    }

    byStudent.push({
      studentId: id,
      displayName: String(student.display_name ?? "학생"),
      gradeLabel,
      className: cls?.className ?? null,
      used: usage.used,
      goldUsed: usage.gold,
    });
  }

  const byGrade = Array.from(gradeMap.entries())
    .map(([gradeLabel, v]) => ({ gradeLabel, ...v }))
    .sort((a, b) => b.used - a.used);
  const byClass = Array.from(classMap.entries())
    .map(([classId, v]) => ({ classId, ...v }))
    .sort((a, b) => b.used - a.used);
  byStudent.sort((a, b) => b.used - a.used);

  const monthlyLimitTotal = perStudentMonthly * Math.max(1, studentCount);
  const goldLimitTotal = perStudentGold * Math.max(1, studentCount);

  return {
    planCode: String(plan.code ?? ""),
    studentCount,
    monthlyUsed,
    monthlyLimitTotal,
    monthlyRemaining: Math.max(0, monthlyLimitTotal - monthlyUsed),
    goldUsed,
    goldLimitTotal,
    goldRemaining: Math.max(0, goldLimitTotal - goldUsed),
    usageMonth,
    byGrade,
    byClass,
    byStudent: byStudent.slice(0, 50),
    gradeRanking: byGrade.slice(0, 5).map((g) => ({
      gradeLabel: g.gradeLabel,
      used: g.used,
    })),
    classRanking: byClass.slice(0, 5).map((c) => ({
      className: c.className,
      used: c.used,
    })),
  };
}

export async function getAcademyAiQuotaForStaff(
  staffId: string,
): Promise<AcademyAiQuotaSummary | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", staffId)
    .maybeSingle();
  const academyId = profile?.academy_id as string | null;
  if (!academyId) return null;
  return getAcademyAiQuotaSummary(academyId);
}
