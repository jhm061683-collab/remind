import { createServiceClient } from "@/lib/supabase/service";
import type { AiEngine } from "@/lib/server/ai/engine-quota";
import { getSubjectName } from "@/lib/subjects";

export type AiTokenUsage = {
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
};

/**
 * 대략적인 원화 환산 (2026년 초 공개 단가 기준, 1 USD ≈ 1,350원).
 * - Gemini Flash: 입력 $0.30 / 1M, 출력 $2.50 / 1M
 * - GPT-4o: 입력 $2.50 / 1M, 출력 $10 / 1M
 * thinking 토큰은 출력 요금으로 청구된다.
 */
export function estimateCostKrw(
  engine: AiEngine,
  usage: AiTokenUsage,
): number {
  const prompt = Math.max(0, usage.promptTokens);
  const output = Math.max(0, usage.outputTokens + usage.thoughtsTokens);
  const usdToKrw = 1350;

  if (engine === "gpt-4o") {
    const usd = (prompt / 1_000_000) * 2.5 + (output / 1_000_000) * 10;
    return Math.round(usd * usdToKrw * 10000) / 10000;
  }

  // gemini flash 계열
  const usd = (prompt / 1_000_000) * 0.3 + (output / 1_000_000) * 2.5;
  return Math.round(usd * usdToKrw * 10000) / 10000;
}

/** 토큰이 없을 때(구 응답) 건당 보수적 추정 */
export function fallbackCostKrw(engine: AiEngine): number {
  return engine === "gpt-4o" ? 5.5 : 1.8;
}

export async function logAiCost(input: {
  userId: string;
  academyId: string | null;
  engine: AiEngine;
  kind?: "extract" | "explain";
  usage?: AiTokenUsage | null;
  subjectId?: string | null;
  imageCount?: number;
  problemCount?: number;
}): Promise<number> {
  const usage = input.usage ?? {
    promptTokens: 0,
    outputTokens: 0,
    thoughtsTokens: 0,
  };
  const hasTokens =
    usage.promptTokens > 0 ||
    usage.outputTokens > 0 ||
    usage.thoughtsTokens > 0;
  const estimated = hasTokens
    ? estimateCostKrw(input.engine, usage)
    : fallbackCostKrw(input.engine);

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("ai_cost_logs").insert({
      user_id: input.userId,
      academy_id: input.academyId,
      engine: input.engine,
      kind: input.kind ?? "extract",
      prompt_tokens: usage.promptTokens,
      output_tokens: usage.outputTokens,
      thoughts_tokens: usage.thoughtsTokens,
      estimated_cost_krw: estimated,
      subject_id: input.subjectId?.trim() || null,
      image_count: Math.max(1, input.imageCount ?? 1),
      problem_count: Math.max(1, input.problemCount ?? 1),
    });
    if (error) {
      console.error("[logAiCost]", error.message);
    }
  } catch (err) {
    console.error("[logAiCost]", err);
  }

  return estimated;
}

export type AiCostBucket = {
  key: string;
  label: string;
  calls: number;
  krw: number;
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  avgKrwPerCall: number;
  /** 추출된 문항 수 합 (한 호출에 여러 문항일 수 있음) */
  problems: number;
  avgKrwPerProblem: number;
};

export type AiCostSummary = {
  todayKrw: number;
  monthKrw: number;
  todayCalls: number;
  monthCalls: number;
  monthPromptTokens: number;
  monthOutputTokens: number;
  monthThoughtsTokens: number;
  avgKrwPerCall: number;
  byEngine: AiCostBucket[];
  bySubject: AiCostBucket[];
};

function emptySummary(): AiCostSummary {
  return {
    todayKrw: 0,
    monthKrw: 0,
    todayCalls: 0,
    monthCalls: 0,
    monthPromptTokens: 0,
    monthOutputTokens: 0,
    monthThoughtsTokens: 0,
    avgKrwPerCall: 0,
    byEngine: [],
    bySubject: [],
  };
}

function startOfKstDayIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return new Date(`${y}-${m}-${d}T00:00:00+09:00`).toISOString();
}

function startOfKstMonthIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return new Date(`${y}-${m}-01T00:00:00+09:00`).toISOString();
}

type Acc = {
  calls: number;
  krw: number;
  promptTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  problems: number;
};

function bump(map: Map<string, Acc>, key: string, delta: Acc) {
  const cur = map.get(key) ?? {
    calls: 0,
    krw: 0,
    promptTokens: 0,
    outputTokens: 0,
    thoughtsTokens: 0,
    problems: 0,
  };
  cur.calls += delta.calls;
  cur.krw += delta.krw;
  cur.promptTokens += delta.promptTokens;
  cur.outputTokens += delta.outputTokens;
  cur.thoughtsTokens += delta.thoughtsTokens;
  cur.problems += delta.problems;
  map.set(key, cur);
}

function toBuckets(
  map: Map<string, Acc>,
  labelOf: (key: string) => string,
): AiCostBucket[] {
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      label: labelOf(key),
      calls: v.calls,
      krw: Math.round(v.krw * 10) / 10,
      promptTokens: v.promptTokens,
      outputTokens: v.outputTokens,
      thoughtsTokens: v.thoughtsTokens,
      avgKrwPerCall:
        v.calls > 0 ? Math.round((v.krw / v.calls) * 100) / 100 : 0,
      problems: v.problems,
      avgKrwPerProblem:
        v.problems > 0 ? Math.round((v.krw / v.problems) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.krw - a.krw);
}

export async function getPlatformAiCostSummary(): Promise<AiCostSummary> {
  const supabase = createServiceClient();
  const todayStart = startOfKstDayIso();
  const monthStart = startOfKstMonthIso();

  const { data, error } = await supabase
    .from("ai_cost_logs")
    .select(
      "engine, subject_id, estimated_cost_krw, prompt_tokens, output_tokens, thoughts_tokens, problem_count, created_at",
    )
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false })
    .limit(10000);

  // 030 마이그레이션 전: 구 컬럼만으로 폴백
  let rows = data;
  if (error || !data) {
    const fallback = await supabase
      .from("ai_cost_logs")
      .select(
        "engine, estimated_cost_krw, prompt_tokens, output_tokens, thoughts_tokens, created_at",
      )
      .gte("created_at", monthStart)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (fallback.error || !fallback.data) {
      return emptySummary();
    }
    rows = fallback.data.map((r) => ({
      ...r,
      subject_id: null,
      problem_count: 1,
    }));
  }

  if (!rows) {
    return emptySummary();
  }

  let todayKrw = 0;
  let monthKrw = 0;
  let todayCalls = 0;
  let monthCalls = 0;
  let monthPromptTokens = 0;
  let monthOutputTokens = 0;
  let monthThoughtsTokens = 0;
  const engineMap = new Map<string, Acc>();
  const subjectMap = new Map<string, Acc>();

  for (const row of rows) {
    const krw = Number(row.estimated_cost_krw ?? 0);
    const engine = String(row.engine ?? "unknown");
    const subject = String(row.subject_id ?? "").trim() || "unknown";
    const prompt = Number(row.prompt_tokens ?? 0);
    const output = Number(row.output_tokens ?? 0);
    const thoughts = Number(row.thoughts_tokens ?? 0);
    const problems = Math.max(1, Number(row.problem_count ?? 1));
    const delta: Acc = {
      calls: 1,
      krw,
      promptTokens: prompt,
      outputTokens: output,
      thoughtsTokens: thoughts,
      problems,
    };

    monthKrw += krw;
    monthCalls += 1;
    monthPromptTokens += prompt;
    monthOutputTokens += output;
    monthThoughtsTokens += thoughts;
    bump(engineMap, engine, delta);
    bump(subjectMap, subject, delta);

    if (String(row.created_at) >= todayStart) {
      todayKrw += krw;
      todayCalls += 1;
    }
  }

  return {
    todayKrw: Math.round(todayKrw * 10) / 10,
    monthKrw: Math.round(monthKrw * 10) / 10,
    todayCalls,
    monthCalls,
    monthPromptTokens,
    monthOutputTokens,
    monthThoughtsTokens,
    avgKrwPerCall:
      monthCalls > 0 ? Math.round((monthKrw / monthCalls) * 100) / 100 : 0,
    byEngine: toBuckets(engineMap, (k) => k),
    bySubject: toBuckets(subjectMap, (k) =>
      k === "unknown" ? "과목 미기록" : getSubjectName(k),
    ),
  };
}
