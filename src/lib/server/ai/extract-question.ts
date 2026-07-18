import type { AiEngine } from "@/lib/server/ai/engine-quota";
import type {
  QuestionExtractInput,
  QuestionExtractResult,
} from "@/lib/server/ai/extract-types";
import { extractWithGemini, getGeminiApiKey } from "@/lib/server/ai/gemini";
import { extractWithOpenAI, getOpenAIApiKey } from "@/lib/server/ai/openai";

export function hasAnyAiExtractKey(): boolean {
  return Boolean(getGeminiApiKey() || getOpenAIApiKey());
}

/** 골드 티켓(GPT-4o)을 실제로 쓸 수 있는지 */
export function canUseGpt4o(): boolean {
  return Boolean(getOpenAIApiKey());
}

/**
 * 플랜·쿼터가 정한 엔진으로 B타입 추출.
 * GPT-4o 키가 없으면 Gemini로 자동 폴백(호출 전에 골드 차감은 막아야 함).
 */
export async function extractQuestion(
  input: QuestionExtractInput,
): Promise<QuestionExtractResult> {
  const engine = resolveRunnableEngine(input.engine);

  if (engine === "gpt-4o") {
    return extractWithOpenAI({ ...input, engine });
  }
  return extractWithGemini({ ...input, engine: "gemini-3.5-flash" });
}

function resolveRunnableEngine(preferred: AiEngine): AiEngine {
  if (preferred === "gpt-4o" && getOpenAIApiKey()) return "gpt-4o";
  if (getGeminiApiKey()) return "gemini-3.5-flash";
  if (getOpenAIApiKey()) return "gpt-4o";
  throw new Error(
    "AI API 키가 없습니다. GEMINI_API_KEY 또는 OPENAI_API_KEY를 설정해 주세요.",
  );
}
