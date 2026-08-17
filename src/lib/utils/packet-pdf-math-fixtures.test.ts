import assert from "node:assert/strict";
import { describe, it } from "node:test";
import katex from "katex";
import { parseMathLikeAnswer } from "./packet-math.ts";
import { QUICK_ANSWER_MATH_FIXTURES } from "./packet-pdf-settings.ts";

describe("quick answer math fixtures render", () => {
  for (const expression of QUICK_ANSWER_MATH_FIXTURES) {
    it(`KaTeX가 ${expression} 를 렌더한다`, () => {
      const html = katex.renderToString(`\\displaystyle ${expression}`, {
        displayMode: false,
        throwOnError: true,
        strict: "ignore",
        output: "html",
      });
      assert.equal(html.includes("katex"), true);
      assert.equal(html.includes("katex-error"), false);
    });

    it(`${expression} 는 수학 정답으로 분류된다`, () => {
      const plan = parseMathLikeAnswer(expression);
      assert.equal(plan.kind, "math");
    });
  }
});
