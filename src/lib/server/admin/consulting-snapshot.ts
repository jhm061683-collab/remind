import { getSubjectName } from "@/lib/subjects";
import { createServiceClient } from "@/lib/supabase/service";
import { getStudentDetailForStaff } from "@/lib/server/admin/queries";
import {
  endOfKstDayIso,
  resolveConsultingPeriod,
  type ConsultingPeriodPreset,
} from "@/lib/utils/date-range";

export type ConsultingTrafficLight = "green" | "yellow" | "red";

export type ConsultingReasonBucket = {
  key: "calc" | "concept" | "misread";
  label: string;
  count: number;
  percent: number;
};

export type ConsultingSnapshot = {
  studentId: string;
  studentName: string;
  periodLabel: string;
  periodDays: number;
  subjectId: string | "all";
  subjectOptions: Array<{ id: string; name: string; count: number }>;
  trafficLight: ConsultingTrafficLight;
  trafficLabel: string;
  reviewFidelityPct: number | null;
  masteryPct: number;
  totalQuestions: number;
  completedQuestions: number;
  dueInPeriod: number;
  reviewedInPeriod: number;
  weaknessLine: string;
  reasonBuckets: ConsultingReasonBucket[];
};

/** 학부모용 3색 오답 원인으로 묶기 */
function bucketWrongReason(reason: string | null): ConsultingReasonBucket["key"] | null {
  if (!reason) return null;
  const text = reason.trim();
  if (!text) return null;
  if (
    /계산|표기|문법|단순 실수|검산|검토/.test(text)
  ) {
    return "calc";
  }
  if (
    /개념|암기|어휘|전략|풀이|서술/.test(text)
  ) {
    return "concept";
  }
  if (
    /오독|발문|조건|선지|보기|지문|자료|함정|시간/.test(text)
  ) {
    return "misread";
  }
  return "concept";
}

function trafficFromMastery(masteryPct: number, fidelity: number | null): {
  light: ConsultingTrafficLight;
  label: string;
} {
  const fidelityScore = fidelity ?? masteryPct;
  const score = Math.round(masteryPct * 0.55 + fidelityScore * 0.45);
  if (score >= 70) {
    return { light: "green", label: "완벽 정복중" };
  }
  if (score >= 40) {
    return { light: "yellow", label: "주의 필요" };
  }
  return { light: "red", label: "집중 케어 필요" };
}

export async function getConsultingSnapshot(input: {
  staffId: string;
  staffRole: "admin" | "sub_admin";
  studentId: string;
  period: ConsultingPeriodPreset;
  subjectId?: string | "all";
}): Promise<ConsultingSnapshot | null> {
  const detail = await getStudentDetailForStaff(
    input.staffId,
    input.staffRole,
    input.studentId,
  );
  if (!detail) return null;

  const { start, end, periodDays, label } = resolveConsultingPeriod(input.period);
  const subjectFilter =
    input.subjectId && input.subjectId !== "all" ? input.subjectId : "all";

  const supabase = createServiceClient();
  const [{ data: questionRows }, { data: activityRows }, { data: subjectSettings }] =
    await Promise.all([
    supabase
      .from("questions")
      .select(
        "id, subject_id, source, wrong_reason, phase, next_review_date, archived, created_at",
      )
      .eq("user_id", input.studentId)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", endOfKstDayIso(end)),
    supabase
      .from("activity_events")
      .select("id, event_type, created_at")
      .eq("user_id", input.studentId)
      .eq("event_type", "reviewed")
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", endOfKstDayIso(end)),
    supabase
      .from("review_settings")
      .select("settings")
      .eq("user_id", input.studentId)
      .eq("subject_id", "__subjects__")
      .maybeSingle(),
  ]);

  const subjectNameById = new Map<string, string>();
  const rawSubjects = (
    subjectSettings?.settings as { subjects?: Array<{ id?: string; name?: string }> } | null
  )?.subjects;
  if (Array.isArray(rawSubjects)) {
    for (const subject of rawSubjects) {
      if (
        typeof subject?.id === "string" &&
        typeof subject?.name === "string" &&
        subject.name.trim()
      ) {
        subjectNameById.set(subject.id, subject.name.trim());
      }
    }
  }

  const allQuestions = (questionRows ?? []).map((row) => ({
    id: String(row.id),
    subjectId: String(row.subject_id),
    source: (row.source as string | null) ?? null,
    wrongReason: (row.wrong_reason as string | null) ?? null,
    phase: String(row.phase),
    nextReviewDate: String(row.next_review_date),
    archived: Boolean(row.archived),
  }));

  const subjectCount = new Map<string, number>();
  for (const q of allQuestions) {
    subjectCount.set(q.subjectId, (subjectCount.get(q.subjectId) ?? 0) + 1);
  }
  const subjectOptions = Array.from(subjectCount.entries())
    .map(([id, count]) => ({
      id,
      name: getSubjectName(id, subjectNameById),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));

  const questions =
    subjectFilter === "all"
      ? allQuestions
      : allQuestions.filter((q) => q.subjectId === subjectFilter);

  const totalQuestions = questions.length;
  const completedQuestions = questions.filter(
    (q) => q.phase === "completed" || q.archived,
  ).length;
  const masteryPct =
    totalQuestions === 0
      ? 0
      : Math.round((completedQuestions / totalQuestions) * 100);

  const dueInPeriod = questions.filter(
    (q) => !q.archived && q.phase !== "completed",
  ).length;
  const reviewedInPeriod = (activityRows ?? []).length;
  const reviewFidelityPct =
    dueInPeriod === 0
      ? null
      : Math.min(100, Math.round((reviewedInPeriod / Math.max(1, dueInPeriod)) * 100));

  // 취약 단원: source(교재·단원) 우선, 없으면 과목명
  const weaknessMap = new Map<string, { label: string; count: number }>();
  for (const q of questions) {
    if (q.phase === "completed" || q.archived) continue;
    const subjectName = getSubjectName(q.subjectId, subjectNameById);
    const unit = q.source?.trim();
    const labelText = unit ? `${subjectName} · ${unit}` : subjectName;
    const key = `${q.subjectId}::${unit ?? ""}`;
    const prev = weaknessMap.get(key) ?? { label: labelText, count: 0 };
    prev.count += 1;
    weaknessMap.set(key, prev);
  }
  const topWeakness = Array.from(weaknessMap.values()).sort(
    (a, b) => b.count - a.count,
  )[0];
  const weaknessLine = topWeakness
    ? `현재 [${topWeakness.label}] 단원의 오답을 가장 어려워하고 있어요`
    : totalQuestions === 0
      ? "이 기간에는 등록된 오답이 아직 없어요"
      : "등록된 오답을 차근차근 정복하고 있어요";

  const bucketCounts: Record<ConsultingReasonBucket["key"], number> = {
    calc: 0,
    concept: 0,
    misread: 0,
  };
  for (const q of questions) {
    const bucket = bucketWrongReason(q.wrongReason);
    if (bucket) bucketCounts[bucket] += 1;
  }
  const reasonTotal =
    bucketCounts.calc + bucketCounts.concept + bucketCounts.misread;
  const reasonBuckets: ConsultingReasonBucket[] = [
    {
      key: "calc",
      label: "계산 실수",
      count: bucketCounts.calc,
      percent:
        reasonTotal === 0
          ? 0
          : Math.round((bucketCounts.calc / reasonTotal) * 100),
    },
    {
      key: "concept",
      label: "개념 미숙",
      count: bucketCounts.concept,
      percent:
        reasonTotal === 0
          ? 0
          : Math.round((bucketCounts.concept / reasonTotal) * 100),
    },
    {
      key: "misread",
      label: "문제 오독",
      count: bucketCounts.misread,
      percent:
        reasonTotal === 0
          ? 0
          : Math.round((bucketCounts.misread / reasonTotal) * 100),
    },
  ];

  const traffic = trafficFromMastery(masteryPct, reviewFidelityPct);

  return {
    studentId: input.studentId,
    studentName: detail.student.displayName,
    periodLabel: label,
    periodDays,
    subjectId: subjectFilter,
    subjectOptions,
    trafficLight: traffic.light,
    trafficLabel: traffic.label,
    reviewFidelityPct,
    masteryPct,
    totalQuestions,
    completedQuestions,
    dueInPeriod,
    reviewedInPeriod,
    weaknessLine,
    reasonBuckets,
  };
}
