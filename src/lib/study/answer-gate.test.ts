import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canConfirmAnswer, hasStudyAnswer } from "./answer-gate.ts";

describe("복습 답 입력 가드", () => {
  it("공백은 답이 아니다", () => {
    assert.equal(hasStudyAnswer(""), false);
    assert.equal(hasStudyAnswer("   "), false);
    assert.equal(hasStudyAnswer("③"), true);
  });

  it("일반 정답 확인은 답이 있어야 한다", () => {
    assert.equal(canConfirmAnswer("answered", ""), false);
    assert.equal(canConfirmAnswer("answered", "12"), true);
  });

  it("잘 모르겠어요는 빈 답도 허용한다", () => {
    assert.equal(canConfirmAnswer("gave_up", ""), true);
  });
});
