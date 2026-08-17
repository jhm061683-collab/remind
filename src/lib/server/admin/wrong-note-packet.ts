import { getSubjectName } from "@/lib/subjects";
import { createServiceClient } from "@/lib/supabase/service";
import { getStudentDetailForStaff } from "@/lib/server/admin/queries";
import {
  endOfKstDayIso,
  resolveConsultingPeriod,
  toDateKey,
  type ConsultingPeriodPreset,
} from "@/lib/utils/date-range";
import { getPhaseLabel } from "@/lib/utils/labels";
import { getQuestionImageUrls } from "@/lib/utils/question-images";
import type { ReviewPhase } from "@/types/subject";

type StaffRole = "admin" | "sub_admin";

export type WrongNotePacketStatusFilter = "all" | "active" | "archived";

export type WrongNotePacketPhase = ReviewPhase;

export const WRONG_NOTE_PACKET_PHASES: WrongNotePacketPhase[] = [
  "short",
  "medium",
  "long",
  "completed",
];

export const DEFAULT_WRONG_NOTE_PACKET_PHASES: WrongNotePacketPhase[] = [
  "short",
  "medium",
  "long",
];

export type WrongNotePacketPeriod =
  | { kind: "preset"; preset: ConsultingPeriodPreset }
  | { kind: "days"; days: number }
  | { kind: "custom"; start: string; end: string };

export type WrongNotePacketItem = {
  id: string;
  number: number;
  subjectId: string;
  subjectName: string;
  createdAt: string;
  createdDateLabel: string;
  problemLatex?: string;
  sharedPassage?: string;
  imageUrls: string[];
  answerText?: string;
  archived: boolean;
};

export type WrongNotePacketSubjectOption = {
  id: string;
  name: string;
};

export type WrongNotePacketData = {
  academyName: string;
  studentName: string;
  classLabel: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  subjectFilterLabel: string;
  statusFilterLabel: string;
  phaseFilterLabel: string;
  generatedAtLabel: string;
  truncated: boolean;
  items: WrongNotePacketItem[];
  subjectOptions: WrongNotePacketSubjectOption[];
};

const MAX_ITEMS = 80;

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
  const subjects = (
    data?.settings as { subjects?: Array<{ id?: string; name?: string }> } | null
  )?.subjects;
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

function resolvePeriod(period: WrongNotePacketPeriod): {
  start: string;
  end: string;
  label: string;
} {
  if (period.kind === "preset") {
    const resolved = resolveConsultingPeriod(period.preset);
    return {
      start: resolved.start,
      end: resolved.end,
      label: resolved.label,
    };
  }
  if (period.kind === "custom") {
    const start = period.start <= period.end ? period.start : period.end;
    const end = period.start <= period.end ? period.end : period.start;
    return {
      start,
      end,
      label: `${start} ~ ${end}`,
    };
  }
  const days = Math.min(365, Math.max(1, Math.floor(period.days)));
  const end = toDateKey(new Date());
  const endDate = new Date(`${end}T12:00:00+09:00`);
  const startDate = new Date(
    endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
  );
  const start = toDateKey(startDate);
  return { start, end, label: `최근 ${days}일` };
}

function statusLabel(status: WrongNotePacketStatusFilter): string {
  if (status === "active") return "다시 푸는 중";
  if (status === "archived") return "보관 완료";
  return "전체";
}

function normalizePhases(
  phases: WrongNotePacketPhase[] | null | undefined,
): WrongNotePacketPhase[] {
  const allowed = new Set<WrongNotePacketPhase>(WRONG_NOTE_PACKET_PHASES);
  const unique = Array.from(
    new Set(
      (phases ?? [])
        .map((p) => p as WrongNotePacketPhase)
        .filter((p) => allowed.has(p)),
    ),
  );
  return unique.length > 0 ? unique : [...DEFAULT_WRONG_NOTE_PACKET_PHASES];
}

function phaseFilterLabel(phases: WrongNotePacketPhase[]): string {
  if (phases.length === WRONG_NOTE_PACKET_PHASES.length) return "전체 단계";
  return phases.map((p) => getPhaseLabel(p)).join(", ");
}

function formatCreatedDate(iso: string): string {
  return toDateKey(iso);
}

export async function getWrongNotePacket(input: {
  staffId: string;
  staffRole: StaffRole;
  studentId: string;
  period: WrongNotePacketPeriod;
  subjectId?: string | null;
  status?: WrongNotePacketStatusFilter;
  phases?: WrongNotePacketPhase[] | null;
}): Promise<WrongNotePacketData> {
  const detail = await getStudentDetailForStaff(
    input.staffId,
    input.staffRole,
    input.studentId,
  );
  if (!detail) {
    throw new Error("PACKET_STUDENT_FORBIDDEN");
  }

  const status = input.status ?? "all";
  const phases = normalizePhases(input.phases);
  const { start, end, label: periodLabel } = resolvePeriod(input.period);
  const supabase = createServiceClient();

  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("academy_id")
    .eq("id", input.staffId)
    .maybeSingle();
  const academyId = staffProfile?.academy_id as string | null;
  if (!academyId) {
    throw new Error("PACKET_ACADEMY_NOT_FOUND");
  }

  let query = supabase
    .from("questions")
    .select(
      "id, subject_id, image_url, extra_image_urls, problem_latex, shared_passage, answer_text, archived, created_at, phase",
    )
    .eq("user_id", input.studentId)
    .gte("created_at", `${start}T00:00:00+09:00`)
    .lte("created_at", endOfKstDayIso(end))
    .in("phase", phases)
    .order("created_at", { ascending: true });

  if (input.subjectId && input.subjectId !== "all") {
    query = query.eq("subject_id", input.subjectId);
  }
  if (status === "active") {
    query = query.eq("archived", false);
  } else if (status === "archived") {
    query = query.eq("archived", true);
  }

  let academy: { name?: string } | null = null;
  let rows: Record<string, unknown>[] | null = null;
  let error: { message?: string } | null = null;
  let subjectNameById: Map<string, string>;

  const first = await Promise.all([
    supabase.from("academies").select("name").eq("id", academyId).maybeSingle(),
    query,
    loadStudentSubjectNames(input.studentId),
  ]);
  academy = first[0].data;
  rows = (first[1].data as Record<string, unknown>[] | null) ?? null;
  error = first[1].error;
  subjectNameById = first[2];

  // shared_passage 컬럼 마이그레이션 전이면 폴백
  if (
    error &&
    (error.message ?? "").toLowerCase().includes("shared_passage")
  ) {
    let fallback = supabase
      .from("questions")
      .select(
        "id, subject_id, image_url, extra_image_urls, problem_latex, answer_text, archived, created_at, phase",
      )
      .eq("user_id", input.studentId)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", endOfKstDayIso(end))
      .in("phase", phases)
      .order("created_at", { ascending: true });
    if (input.subjectId && input.subjectId !== "all") {
      fallback = fallback.eq("subject_id", input.subjectId);
    }
    if (status === "active") fallback = fallback.eq("archived", false);
    else if (status === "archived") fallback = fallback.eq("archived", true);
    const retry = await fallback;
    rows = (retry.data as Record<string, unknown>[] | null) ?? null;
    error = retry.error;
  }

  if (error) {
    console.error("[getWrongNotePacket]", error);
    throw new Error("PACKET_QUERY_FAILED");
  }

  const allRows = rows ?? [];
  const truncated = allRows.length > MAX_ITEMS;
  const sliced = truncated ? allRows.slice(0, MAX_ITEMS) : allRows;

  const subjectCount = new Map<string, string>();
  const items: WrongNotePacketItem[] = sliced.map((row, index) => {
    const subjectId = String(row.subject_id);
    const subjectName = getSubjectName(subjectId, subjectNameById);
    subjectCount.set(subjectId, subjectName);
    const imageUrls = getQuestionImageUrls({
      imageDataUrl: String(row.image_url ?? ""),
      extraImageDataUrls: Array.isArray(row.extra_image_urls)
        ? (row.extra_image_urls as string[])
        : [],
    });
    const answerText =
      typeof row.answer_text === "string" && row.answer_text.trim()
        ? row.answer_text.trim()
        : undefined;
    return {
      id: String(row.id),
      number: index + 1,
      subjectId,
      subjectName,
      createdAt: String(row.created_at),
      createdDateLabel: formatCreatedDate(String(row.created_at)),
      problemLatex:
        typeof row.problem_latex === "string" && row.problem_latex.trim()
          ? row.problem_latex.trim()
          : undefined,
      sharedPassage:
        typeof row.shared_passage === "string" && row.shared_passage.trim()
          ? row.shared_passage.trim()
          : undefined,
      imageUrls,
      answerText,
      archived: Boolean(row.archived),
    };
  });

  const subjectOptions = [...subjectCount.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  // 필터용: 학생 설정 과목도 옵션에 합침
  for (const [id, name] of subjectNameById) {
    if (!subjectOptions.some((s) => s.id === id)) {
      subjectOptions.push({ id, name });
    }
  }
  subjectOptions.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const classLabel =
    detail.student.classNames.length > 0
      ? detail.student.classNames.join(", ")
      : detail.student.className?.trim() || "미배정";

  const subjectFilterLabel =
    input.subjectId && input.subjectId !== "all"
      ? getSubjectName(input.subjectId, subjectNameById)
      : "전체 과목";

  return {
    academyName: String(academy?.name ?? "학원"),
    studentName: detail.student.displayName,
    classLabel,
    periodLabel,
    periodStart: start,
    periodEnd: end,
    subjectFilterLabel,
    statusFilterLabel: statusLabel(status),
    phaseFilterLabel: phaseFilterLabel(phases),
    generatedAtLabel: toDateKey(new Date()),
    truncated,
    items,
    subjectOptions,
  };
}
