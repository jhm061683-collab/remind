import {
  normalizeChoiceMarker,
  normalizeMcAnswer,
  renumberChoiceOptions,
  isMathHeavyContent,
} from "../src/lib/utils/packet-content.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// CASE 1: already circled
assert(
  renumberChoiceOptions("① 하나\n② 둘\n③ 셋\n④ 넷\n⑤ 다섯").includes("①"),
  "case1 keep circled",
);

// CASE 2: backtick abcd
const broken = renumberChoiceOptions(`11. 적절한 것은?
\`첫째
a둘째
b셋째
c넷째
d다섯째`);
assert(broken.includes("① 첫째"), `case2-1 got:\n${broken}`);
assert(broken.includes("⑤ 다섯째"), `case2-5 got:\n${broken}`);
assert(!/\na둘째/.test(broken), "case2 no raw a");

// CASE 3: answer d (OCR: ` a b c d → ①②③④⑤)
assert(normalizeMcAnswer("d") === "⑤", "case3 d→⑤");
assert(normalizeMcAnswer("a") === "②", "case3 a→②");
assert(normalizeChoiceMarker("`") === "①", "backtick marker");
assert(normalizeMcAnswer("①") === "①", "keep circled answer");

// CASE 4: 미등록
assert(normalizeMcAnswer("미등록") === "미등록", "case4");
assert(normalizeMcAnswer("***") === "***", "stars");
assert(normalizeMcAnswer("$k<4$") === "$k<4$", "math answer");

// verbal mc not math-heavy
assert(
  !isMathHeavyContent(
    "윗글에서 알 수 있는 내용으로 가장 적절한 것은?\na foo\nb bar\nc baz\nd qux\ne quux",
  ),
  "verbal not math heavy",
);

console.log("ALL PASS");
