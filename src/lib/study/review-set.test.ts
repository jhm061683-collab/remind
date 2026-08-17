import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateSetMinutes, resumeReviewSet, selectReviewSet } from "./review-set.ts";

describe("복습 세트 고르기", () => {
  it("86개 due 중 10개만 고른다", () => {
    const due = Array.from({ length: 86 }, (_, i) => ({
      id: `q${i}`,
      nextReviewDate: `2026-01-01T00:00:00.000Z`,
    }));
    const set = selectReviewSet(due);
    assert.equal(set.length, 10);
    assert.equal(set[0]?.id, "q0");
    assert.equal(set[9]?.id, "q9");
  });

  it("5개면 5개만 고른다", () => {
    const due = Array.from({ length: 5 }, (_, i) => ({
      id: `q${i}`,
      nextReviewDate: "2026-01-01T00:00:00.000Z",
    }));
    assert.equal(selectReviewSet(due).length, 5);
  });

  it("빈 목록은 빈 세트다", () => {
    assert.equal(selectReviewSet([]).length, 0);
  });

  it("예상 시간은 문제 수에 비례한다", () => {
    assert.equal(estimateSetMinutes(0), 0);
    assert.equal(estimateSetMinutes(10), 8);
  });

  it("저장된 세트가 있으면 그 순서로 이어한다", () => {
    const due = [
      { id: "a", nextReviewDate: "2026-01-01" },
      { id: "b", nextReviewDate: "2026-01-02" },
      { id: "c", nextReviewDate: "2026-01-03" },
    ];
    const resumed = resumeReviewSet(due, { ids: ["c", "a"], dueTotal: 3 });
    assert.deepEqual(
      resumed.map((item) => item.id),
      ["c", "a"],
    );
  });
});
