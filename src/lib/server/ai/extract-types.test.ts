import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeAiLatexField,
  normalizeExtractJson,
  repairLatexBackslashesInJson,
} from "./extract-types.ts";

describe("AI LaTeX JSON 정규화", () => {
  it("\\n 시작 명령과 실제 줄바꿈을 구분한다", () => {
    const commands = [
      String.raw`x \neq 3`,
      String.raw`a \ne b`,
      String.raw`\nabla f(x)`,
      String.raw`x \notin A`,
      String.raw`\nu = 0.3`,
      String.raw`\newline`,
      String.raw`\newcommand{\R}{\mathbb{R}}`,
    ];
    for (const command of commands) {
      const parsed = normalizeExtractJson(
        JSON.stringify({ sharedPassage: "", problems: [{ problemLatex: command }] }),
      );
      assert.equal(parsed.problems[0]?.problemLatex, command);
    }

    const multiline = "첫째 줄\n둘째 줄";
    assert.equal(
      normalizeExtractJson(
        JSON.stringify({ sharedPassage: multiline, problems: [{ problemLatex: "문제" }] }),
      ).sharedPassage,
      multiline,
    );
  });

  it("AI가 한 번만 escape한 LaTeX 명령만 제한적으로 복구한다", () => {
    const malformed = '{"problems":[{"problemLatex":"x \\neq 3, \\nabla f"}]}';
    assert.notEqual(repairLatexBackslashesInJson(malformed), malformed);
    const parsed = normalizeExtractJson(malformed);
    assert.equal(parsed.problems[0]?.problemLatex, String.raw`x \neq 3, \nabla f`);
  });

  it("원화 명령 표시는 수식 필드에서만 보정하고 통화는 유지한다", () => {
    assert.equal(normalizeAiLatexField("₩neq"), String.raw`\neq`);
    assert.equal(normalizeAiLatexField("가격 ₩10,000"), "가격 ₩10,000");
    assert.equal(normalizeAiLatexField("일반 ₩가격"), "일반 ₩가격");
  });

  it("여러 줄·분수·루트·행렬과 neq를 함께 보존한다", () => {
    const value = String.raw`첫째 줄
$$\frac{\sqrt{x}}{2} \neq \begin{matrix}1&0\\0&1\end{matrix}$$`;
    const parsed = normalizeExtractJson(
      JSON.stringify({ sharedPassage: "", problems: [{ problemLatex: value }] }),
    );
    assert.equal(parsed.problems[0]?.problemLatex, value);
  });

  it("구조화 JSON이 끝까지 깨져도 원문을 수정 가능한 문제 문구로 보존한다", () => {
    const raw = "{깨진 JSON이지만 \\neq 원문은 남긴다";
    assert.equal(normalizeExtractJson(raw).problems[0]?.problemLatex, raw);
  });
});
