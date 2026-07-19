import { createServiceClient } from "@/lib/supabase/service";
import type { AiEngine } from "@/lib/server/ai/engine-quota";

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
    await supabase.from("ai_cost_logs").insert({
      user_id: input.userId,
      academy_id: input.academyId,
      engine: input.engine,
      kind: input.kind ?? "extract",
      prompt_tokens: usage.promptTokens,
      output_tokens: usage.outputTokens,
      thoughts_tokens: usage.thoughtsTokens,
      estimated_cost_krw: estimated,
    });
  } catch (err) {
    console.error("[logAiCost]", err);
  }

  return estimated;
}

export type AiCostSummary = {
  todayKrw: number;
  monthKrw: number;
  todayCalls: number;
  monthCalls: number;
  byEngine: Array<{ engine: string; calls: number; krw: number }>;
};

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
  // KST 00:00 = UTC 전날 15:00
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

export async function getPlatformAiCostSummary(): Promise<AiCostSummary> {
  const supabase = createServiceClient();
  const todayStart = startOfKstDayIso();
  const monthStart = startOfKstMonthIso();

  const { data, error } = await supabase
    .from("ai_cost_logs")
    .select("engine, estimated_cost_krw, created_at")
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !data) {
    return {
      todayKrw: 0,
      monthKrw: 0,
      todayCalls: 0,
      monthCalls: 0,
      byEngine: [],
    };
  }

  let todayKrw = 0;
  let monthKrw = 0;
  let todayCalls = 0;
  let monthCalls = 0;
  const engineMap = new Map<string, { calls: number; krw: number }>();

  for (const row of data) {
    const krw = Number(row.estimated_cost_krw ?? 0);
    const engine = String(row.engine ?? "unknown");
    monthKrw += krw;
    monthCalls += 1;
    const bucket = engineMap.get(engine) ?? { calls: 0, krw: 0 };
    bucket.calls += 1;
    bucket.krw += krw;
    engineMap.set(engine, bucket);

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
    byEngine: [...engineMap.entries()].map(([engine, v]) => ({
      engine,
      calls: v.calls,
      krw: Math.round(v.krw * 10) / 10,
    })),
  };
}
