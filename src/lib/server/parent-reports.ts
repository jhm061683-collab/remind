import { createHash, randomBytes } from "node:crypto";
import { getSubjectName } from "@/lib/subjects";
import { createServiceClient } from "@/lib/supabase/service";
import { getStudentDetailForStaff } from "@/lib/server/admin/queries";
import type {
  ParentReportPublicData,
  ParentReportSnapshot,
} from "@/lib/types/parent-report";

type StaffRole = "admin" | "sub_admin";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfDate(date: string): string {
  return new Date(`${date}T23:59:59.999+09:00`).toISOString();
}

function startOfDate(date: string): string {
  return new Date(`${date}T00:00:00+09:00`).toISOString();
}

async function loadStudentSubjectNames(
  studentId: string,
): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", studentId)
    .eq("subject_id", "__subjects__")
    .maybeSingle();
  const subjects = (data?.settings as { subjects?: Array<{ id?: string; name?: string }> } | null)
    ?.subjects;
  const map = new Map<string, string>();
  if (!Array.isArray(subjects)) return map;
  for (const subject of subjects) {
    if (
      typeof subject?.id === "string" &&
      typeof subject?.name === "string" &&
      subject.name.trim()
    ) {
      map.set(subject.id, subject.name.trim());
    }
  }
  return map;
}

export async function createParentReport(input: {
  staffId: string;
  staffRole: StaffRole;
  studentId: string;
  periodDays: number;
}): Promise<{ token: string; snapshot: ParentReportSnapshot }> {
  const detail = await getStudentDetailForStaff(
    input.staffId,
    input.staffRole,
    input.studentId,
  );
  if (!detail) {
    throw new Error("REPORT_STUDENT_FORBIDDEN");
  }

  const days = Math.min(365, Math.max(1, Math.floor(input.periodDays)));
  const periodEndDate = new Date();
  const periodStartDate = new Date();
  periodStartDate.setDate(periodStartDate.getDate() - (days - 1));
  const periodStart = dateOnly(periodStartDate);
  const periodEnd = dateOnly(periodEndDate);

  const supabase = createServiceClient();
  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", input.staffId)
    .maybeSingle();
  const academyId = staffProfile?.academy_id as string | null;
  if (!academyId) {
    throw new Error("REPORT_ACADEMY_NOT_FOUND");
  }

  const [{ data: academy }, { data: questionRows }, { count: reviewCount }, subjectNameById] =
    await Promise.all([
      supabase
        .from("academies")
        .select("name")
        .eq("id", academyId)
        .maybeSingle(),
      supabase
        .from("questions")
        .select(
          "id, subject_id, source, wrong_reason, reflection_memo, phase, created_at",
        )
        .eq("user_id", input.studentId)
        .gte("created_at", startOfDate(periodStart))
        .lte("created_at", endOfDate(periodEnd))
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", input.studentId)
        .eq("event_type", "reviewed")
        .gte("created_at", startOfDate(periodStart))
        .lte("created_at", endOfDate(periodEnd)),
      loadStudentSubjectNames(input.studentId),
    ]);

  const questions = (questionRows ?? []).map((row) => ({
    id: String(row.id),
    subjectId: String(row.subject_id),
    subjectName: getSubjectName(String(row.subject_id), subjectNameById),
    source: (row.source as string | null) ?? null,
    wrongReason: (row.wrong_reason as string | null) ?? null,
    reflectionMemo: (row.reflection_memo as string | null) ?? null,
    phase: String(row.phase),
    createdAt: String(row.created_at),
  }));
  const completedQuestions = questions.filter(
    (question) => question.phase === "completed",
  ).length;

  const subjectMap = new Map<
    string,
    { subjectName: string; count: number; completed: number }
  >();
  const wrongReasonMap = new Map<string, number>();
  for (const question of questions) {
    const subject = subjectMap.get(question.subjectId) ?? {
      subjectName: question.subjectName,
      count: 0,
      completed: 0,
    };
    subject.count += 1;
    if (question.phase === "completed") subject.completed += 1;
    subjectMap.set(question.subjectId, subject);

    if (question.wrongReason) {
      wrongReasonMap.set(
        question.wrongReason,
        (wrongReasonMap.get(question.wrongReason) ?? 0) + 1,
      );
    }
  }

  const title = `${detail.student.displayName} 학생 학습 보고서`;
  const snapshot: ParentReportSnapshot = {
    version: 1,
    title,
    academyName: String(academy?.name ?? "Re:mind"),
    studentName: detail.student.displayName,
    gradeLabel: detail.student.gradeLabel,
    classNames: detail.student.classNames,
    teacherNames: detail.student.teacherNames,
    generatedAt: new Date().toISOString(),
    periodStart,
    periodEnd,
    summary: {
      totalQuestions: questions.length,
      completedQuestions,
      completionRate:
        questions.length > 0
          ? Math.round((completedQuestions / questions.length) * 100)
          : 0,
      totalReviews: reviewCount ?? 0,
    },
    bySubject: [...subjectMap.entries()]
      .map(([subjectId, value]) => ({ subjectId, ...value }))
      .sort((a, b) => b.count - a.count),
    wrongReasons: [...wrongReasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    questions: questions.slice(0, 50),
  };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const { error } = await supabase.from("parent_reports").insert({
    academy_id: academyId,
    student_id: input.studentId,
    created_by: input.staffId,
    token_hash: hashToken(token),
    share_token: token,
    title,
    period_start: periodStart,
    period_end: periodEnd,
    snapshot,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  return { token, snapshot };
}

export async function listParentReportsForStaff(input: {
  staffId: string;
  staffRole: StaffRole;
  studentIds?: string[];
  query?: string;
  /** 최근 발급분만 (기본 30일 · 최대 40건) */
  recentOnly?: boolean;
}): Promise<
  Array<{
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
    path: string;
  }>
> {
  const supabase = createServiceClient();
  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", input.staffId)
    .maybeSingle();
  const academyId = staffProfile?.academy_id as string | null;
  if (!academyId) return [];

  let studentFilter = input.studentIds;
  if (input.staffRole === "sub_admin") {
    const { data: assigned } = await supabase
      .from("student_assignments")
      .select("student_id")
      .eq("sub_admin_id", input.staffId);
    const assignedIds = (assigned ?? []).map((a) => a.student_id as string);
    studentFilter = studentFilter
      ? studentFilter.filter((id) => assignedIds.includes(id))
      : assignedIds;
  }

  const sinceIso = input.recentOnly
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  let q = supabase
    .from("parent_reports")
    .select(
      "id, student_id, title, period_start, period_end, created_at, share_token, snapshot, revoked_at, expires_at",
    )
    .eq("academy_id", academyId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(input.recentOnly ? 40 : 80);

  if (sinceIso) q = q.gte("created_at", sinceIso);

  if (studentFilter && studentFilter.length > 0) {
    q = q.in("student_id", studentFilter);
  } else if (input.staffRole === "sub_admin") {
    return [];
  }

  const { data } = await q;
  const now = Date.now();
  const queryText = input.query?.trim().toLowerCase() ?? "";

  return (data ?? [])
    .filter((row) => {
      if (row.expires_at && new Date(row.expires_at).getTime() < now) return false;
      if (!row.share_token) return false;
      if (!queryText) return true;
      const snap = row.snapshot as { studentName?: string } | null;
      const hay = `${snap?.studentName ?? ""} ${row.title ?? ""}`.toLowerCase();
      return hay.includes(queryText);
    })
    .map((row) => {
      const snap = row.snapshot as { studentName?: string } | null;
      return {
        id: row.id as string,
        studentId: row.student_id as string,
        studentName: snap?.studentName ?? "학생",
        title: String(row.title ?? "보고서"),
        periodStart: String(row.period_start),
        periodEnd: String(row.period_end),
        createdAt: String(row.created_at),
        path: `/report/${row.share_token}`,
      };
    });
}

export async function revokeParentReportForStaff(input: {
  staffId: string;
  staffRole: StaffRole;
  reportId: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", input.staffId)
    .maybeSingle();
  const academyId = staffProfile?.academy_id as string | null;
  if (!academyId) throw new Error("REPORT_FORBIDDEN");

  const { data: report } = await supabase
    .from("parent_reports")
    .select("id, student_id, academy_id")
    .eq("id", input.reportId)
    .eq("academy_id", academyId)
    .maybeSingle();
  if (!report) throw new Error("REPORT_FORBIDDEN");

  if (input.staffRole === "sub_admin") {
    const { data: assigned } = await supabase
      .from("student_assignments")
      .select("student_id")
      .eq("sub_admin_id", input.staffId)
      .eq("student_id", report.student_id)
      .maybeSingle();
    if (!assigned) throw new Error("REPORT_FORBIDDEN");
  }

  const { error } = await supabase
    .from("parent_reports")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", input.reportId);
  if (error) throw error;
}

export async function getParentReportByToken(
  token: string,
): Promise<ParentReportPublicData | null> {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("parent_reports")
    .select("snapshot, expires_at, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return {
    snapshot: data.snapshot as ParentReportSnapshot,
    expiresAt: (data.expires_at as string | null) ?? null,
  };
}
