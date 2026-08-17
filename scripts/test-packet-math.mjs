/**
 * 수학 표현 정규화 · figure 토큰 분리 단위 테스트
 * 실행: node scripts/test-packet-math.mjs
 */
import {
  normalizeMathExpression,
  parseMathLikeAnswer,
  containsMathExpression,
  splitMixedMathSegments,
  wrapBareMathRuns,
  expandFracSqrtToText,
} from "../src/lib/utils/packet-math.ts";
import {
  splitFigureParts,
  extractFigureUrls,
  latexToReadableText,
} from "../src/lib/utils/packet-content.ts";

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures += 1;
    console.error(`FAIL: ${msg}`);
  }
}
function eq(actual, expected, msg) {
  assert(actual === expected, `${msg} — got ${JSON.stringify(actual)}`);
}

// --- 분수 정규화 ---
eq(normalizeMathExpression("frac(5)2"), "\\frac{5}{2}", "frac(5)2 → \\frac{5}{2}");
eq(normalizeMathExpression("frac{5}{2}"), "\\frac{5}{2}", "frac{5}{2}");
eq(
  normalizeMathExpression("\\frac{\\sqrt{5}}{2}"),
  "\\frac{\\sqrt{5}}{2}",
  "이미 올바른 LaTeX 유지",
);
eq(
  normalizeMathExpression("frac(sqrt(5))2"),
  "\\frac{\\sqrt{5}}{2}",
  "중첩 루트 분수",
);
eq(normalizeMathExpression("sqrt(2)"), "\\sqrt{2}", "sqrt(2)");
eq(normalizeMathExpression("√2"), "\\sqrt{2}", "√2");
eq(normalizeMathExpression("3x-2y-26=0"), "3x-2y-26=0", "대수식 보존");

// --- 기하 기호 ---
assert(
  normalizeMathExpression("AD ∥ BC").includes("\\parallel"),
  "∥ → \\parallel",
);
assert(
  normalizeMathExpression("AB ⊥ CD").includes("\\perp"),
  "⊥ → \\perp",
);
assert(
  normalizeMathExpression("AD || BC").includes("\\parallel"),
  "|| → \\parallel",
);
assert(
  normalizeMathExpression("∠APC = 90°").includes("\\angle"),
  "∠ → \\angle",
);

// --- 수식 판정 ---
assert(!containsMathExpression("미등록"), "미등록은 수식 아님");
assert(!containsMathExpression("8"), "순수 숫자는 수식 아님");
assert(containsMathExpression("3x-2y-26=0"), "대수식 판정");
assert(containsMathExpression("frac(5)2"), "느슨한 분수 판정");
assert(containsMathExpression("$\\frac{1}{2}$"), "LaTeX 판정");
assert(containsMathExpression("x≥1"), "≥ 는 수식");
assert(containsMathExpression("x∈A"), "∈ 는 수식");
eq(parseMathLikeAnswer("x≥1").kind, "math", "≥ 정답은 수학 렌더");
assert(containsMathExpression("(a, b)"), "문자 좌표쌍 판정");
assert(
  !containsMathExpression("(단, 자연수이다)"),
  "한글 괄호 문구는 수식 아님",
);

// --- 빠른정답 계획 ---
eq(parseMathLikeAnswer("미등록").kind, "status", "미등록 상태");
eq(parseMathLikeAnswer("미공개").kind, "status", "미공개 상태");
eq(parseMathLikeAnswer("***").kind, "status", "*** 상태");
eq(parseMathLikeAnswer("8").kind, "plain", "숫자 정답");
eq(parseMathLikeAnswer("(10,0)").kind, "math", "좌표 정답은 수학 렌더");
eq(parseMathLikeAnswer("2x-y=0").kind, "math", "일차식 정답은 수학 렌더");
eq(parseMathLikeAnswer("frac(5)2").kind, "math", "분수 정답은 수학 렌더");
eq(
  parseMathLikeAnswer("\\frac{\\sqrt{5}}{2}").kind,
  "math",
  "루트 분수 정답",
);

const multi = parseMathLikeAnswer("3x-2y-26=0 또는 3x-2y+26=0");
eq(multi.kind, "math", "복수 정답은 수학 렌더");
assert(
  multi.segments.some((s) => s.type === "text" && s.value.includes("또는")),
  "「또는」은 텍스트 세그먼트로 유지",
);
eq(
  multi.segments.filter((s) => s.type === "math").length,
  2,
  "양옆 수식 2개",
);

// 정답에 raw 토큰이 남지 않아야 한다
for (const plan of [
  parseMathLikeAnswer("frac(5)2"),
  parseMathLikeAnswer("\\frac{\\sqrt{5}}{2}"),
]) {
  assert(
    plan.kind === "math" &&
      plan.segments.every((s) => !/frac\(/.test(s.value)),
    "raw frac( 토큰 제거",
  );
}

// --- 혼합 문장 분리 ---
const mixed = splitMixedMathSegments("점 $\\text{P}(1,1)$에서 접선");
assert(mixed.some((s) => s.type === "math"), "혼합 문장에서 수식 분리");
assert(mixed.some((s) => s.type === "text"), "혼합 문장에서 한글 유지");

// --- 맨몸 수식 감싸기 ---
assert(
  /\$\\overline\{\\mathrm\{AD\}\} \\parallel/.test(wrapBareMathRuns("AD ∥ BC")),
  "AD ∥ BC → KaTeX 수식",
);

// --- 텍스트 폴백에서 중첩 분수 ---
eq(
  expandFracSqrtToText("\\frac{\\sqrt{5}}{2}"),
  "(√(5))/(2)",
  "중첩 분수 텍스트 변환",
);
assert(
  !/frac/.test(latexToReadableText("\\frac{\\sqrt{5}}{2}")),
  "텍스트 폴백에 frac 문자열이 남지 않음",
);
assert(
  latexToReadableText("$\\overline{\\text{AD}} \\parallel \\overline{\\text{PB}}$").includes("∥"),
  "\\parallel → ∥ 기호",
);

// --- FIGURE 토큰 ---
const figureSource =
  "문제 본문\n\n[[FIGURE:https://example.com/a.jpg]]\n\n이어지는 문장";
const parts = splitFigureParts(figureSource);
eq(parts.filter((p) => p.type === "figure").length, 1, "figure 파트 1개");
assert(
  parts.every((p) => p.type !== "text" || !/\[\[FIGURE/.test(p.text)),
  "텍스트 파트에 raw 토큰 없음",
);
eq(
  extractFigureUrls(figureSource)[0],
  "https://example.com/a.jpg",
  "figure URL 추출",
);
eq(
  splitFigureParts("본문 [[FIGURE:javascript:alert(1)]]").filter(
    (p) => p.type === "figureMissing",
  ).length,
  1,
  "안전하지 않은 URL은 figureMissing",
);
assert(
  !/\[\[FIGURE/.test(latexToReadableText(figureSource).replace(/[\s\S]*/, "")),
  "sanity",
);

if (failures > 0) {
  console.error(`\n${failures}건 실패`);
  process.exit(1);
}
console.log("packet-math tests OK");
