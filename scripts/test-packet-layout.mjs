import {
  findBalancedSplit,
  packMathBalanced,
  resolveLayoutMode,
  splitExamPassagePieces,
  guardPassageHeaderOrphans,
  isPassageHeaderOnly,
  packExamFlow,
  validatePackedLayout,
} from "../src/lib/utils/packet-layout.ts";
import { flattenAlignedConditions } from "../src/lib/utils/packet-math-layout.ts";
import {
  resolveMathSolveSpacePt,
  mergePacketLayoutConfig,
} from "../src/lib/utils/packet-layout-config.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(resolveLayoutMode({ subjectName: "국어" }) === "exam", "korean exam");
assert(resolveLayoutMode({ subjectName: "수학" }) === "math", "math mode");
assert(resolveLayoutMode({ subjectName: "영어" }) === "exam", "eng exam");

const split = findBalancedSplit([100, 100, 100, 100], 250);
assert(split === 2, `expected split 2 got ${split}`);

const units = [1, 2, 3, 4, 5].map((n) => ({
  key: `u${n}`,
  itemId: `i${n}`,
  mode: "math",
  splittable: false,
  chrome: "math",
  showMeta: true,
  continuation: false,
  height: 200,
}));
const pages = packMathBalanced(units, 450);
assert(pages.length >= 1, "pages");
assert(pages[0].left.length > 0 && pages[0].right.length > 0, "both columns used");

const pieces = splitExamPassagePieces("가나다. ".repeat(80), 120);
assert(pieces.length > 1, "passage split");
assert(pieces[pieces.length - 1].length >= 20 || pieces.length === 1, "orphan merge");

const APC = `$$\\begin{aligned}
&\\text{(가) } \\sin(\\angle\\text{APC}) = \\frac{1}{r},\\ \\sin(\\angle\\text{BQC}) = \\frac{2}{4-r} \\\\
&\\text{(나) 삼각형 } \\text{APC}\\text{의 외심과 삼각형 } \\text{BQC}\\text{의 외심 사이의} \\\\
&\\quad\\ \\ \\text{거리는 } 4\\text{이다.}
\\end{aligned}$$`;
const flat = flattenAlignedConditions(APC);
assert(flat.includes("외심"), `flatten keeps 외심: ${flat}`);
assert(flat.includes("거리는"), `flatten keeps 거리는: ${flat}`);

const headerOnly = "[11~14] 다음 글을 읽고 물음에 답하시오.";
assert(isPassageHeaderOnly(headerOnly, 3), "header only detected");
const guarded = guardPassageHeaderOrphans(
  [headerOnly, "(가) 본문 첫 줄입니다.\n둘째 줄.\n셋째 줄."],
  3,
);
assert(guarded.length === 1, "header merged with body");
assert(guarded[0].includes("본문"), "merged has body");

const solveNormal = resolveMathSolveSpacePt(
  mergePacketLayoutConfig({ math: { solveSpace: "normal" } }),
);
const solveWide = resolveMathSolveSpacePt(
  mergePacketLayoutConfig({ math: { solveSpace: "wide" } }),
);
assert(solveWide > solveNormal, "wide solve space > normal");

const examLogs = [];
const examPages = packExamFlow(
  [
    {
      key: "passage",
      itemId: "k1",
      mode: "exam",
      splittable: true,
      chrome: "none",
      sectionLabel: "지문",
      showMeta: true,
      continuation: false,
      textContent:
        "[1~2] 다음 글을 읽고 물음에 답하시오.\n본문 첫 줄.\n본문 둘째 줄.\n본문 셋째 줄.",
      height: 300,
    },
    {
      key: "question",
      itemId: "k1",
      mode: "exam",
      splittable: false,
      chrome: "exam",
      showMeta: false,
      continuation: true,
      textContent: "1. 질문\n① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯",
      height: 250,
    },
  ],
  680,
  examLogs,
);
assert(
  examPages[0].left.some((unit) => unit.key === "question"),
  "question stays in current column when it fits",
);
const validation = validatePackedLayout(examPages, examLogs, 680, 3);
assert(validation.emptyPages === 0, "no empty pages");
assert(validation.overflowingColumns === 0, "no column overflow");
assert(validation.orphanSectionHeaders === 0, "no orphan header");
assert(validation.unjustifiedMoves === 0, "no unjustified moves");

console.log("layout ALL PASS");
