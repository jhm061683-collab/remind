/**
 * flattenAlignedConditions 단위 테스트
 * 실행: node --experimental-strip-types scripts/test-flatten-aligned.mjs
 */
import { flattenAlignedConditions } from "../src/lib/utils/packet-math-layout.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const APC = `길이가 $6$인 선분 $\\text{AB}$를 $1:2$로 내분하는 점을 $\\text{C}$라 할 때, 두 점 $\\text{P}$, $\\text{Q}$가 $1 < r < 2$인 상수 $r$에 대하여 다음 조건을 만족시킨다.

$$\\begin{aligned}
&\\text{(가) } \\sin(\\angle\\text{APC}) = \\frac{1}{r},\\ \\sin(\\angle\\text{BQC}) = \\frac{2}{4-r} \\\\
&\\text{(나) 삼각형 } \\text{APC}\\text{의 외심과 삼각형 } \\text{BQC}\\text{의 외심 사이의} \\\\
&\\quad\\ \\ \\text{거리는 } 4\\text{이다.}
\\end{aligned}$$

네 점 $\\text{A}$, $\\text{B}$, $\\text{P}$, $\\text{Q}$를 꼭짓점으로 하는 사각형의 넓이의 최댓값이 $p + q\\sqrt{7}$일 때, $p+q$의 값을 구하시오. (단, $p$와 $q$는 유리수이다.) [4점]`;

const out = flattenAlignedConditions(APC);

assert(out.includes("외심과"), `expected 외심과 in output:\n${out}`);
assert(out.includes("거리는"), `expected 거리는 in output:\n${out}`);
assert(out.includes("(가)"), `expected (가):\n${out}`);
assert(out.includes("(나)"), `expected (나):\n${out}`);
assert(!/\\begin\{aligned\}/.test(out), "aligned block should be flattened");
assert(!/\\quad/.test(out), "quad continuation should be merged");

console.log("flattenAlignedConditions PASS");
console.log("--- output sample ---");
console.log(out.slice(0, 600));
