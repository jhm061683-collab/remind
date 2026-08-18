import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categorizeWrongReason } from "./wrong-reason-category.ts";

describe("오답 사유 시스템 분류", () => {
  it("이미 중립 라벨이면 그대로 둔다", () => {
    assert.equal(categorizeWrongReason("계산 실수"), "계산 실수");
  });

  it("키워드가 있으면 중립 분류로 묶는다", () => {
    assert.equal(categorizeWrongReason("조건 오독"), "조건 누락");
    assert.equal(categorizeWrongReason("연산 실수"), "계산 실수");
  });

  it("매핑 안 되는 원문은 기타로 보낸다. 원문은 호출 측에서 보존한다", () => {
    assert.equal(categorizeWrongReason("내가 바보라서"), "기타");
    assert.equal(categorizeWrongReason(""), "기타");
  });
});
