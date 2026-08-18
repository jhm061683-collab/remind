import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countTodayDue, isDueTodayOrOverdue, isOverdue } from "./today-due";

const now = new Date("2026-08-18T12:00:00+09:00");

describe("오늘 복습 대상 수", () => {
  it("보관함 전체와 오늘 복습은 다른 집합이다", () => {
    const questions = [
      { nextReviewDate: "2026-08-18T12:00:00+09:00" },
      { nextReviewDate: "2026-08-19T00:00:00+09:00" },
      { nextReviewDate: "2026-08-10T00:00:00+09:00", archived: true },
      { nextReviewDate: "2026-08-10T00:00:00+09:00", phase: "completed" },
    ];
    assert.equal(questions.length, 4);
    assert.equal(countTodayDue(questions, now), 1);
  });

  it("로딩 전 null과 실제 0건을 구분할 수 있다", () => {
    const loadingCount: number | null = null;
    const readyZero = countTodayDue([], now);
    assert.equal(loadingCount, null);
    assert.equal(readyZero, 0);
  });

  it("밀린 복습은 오늘보다 이전 due만 센다", () => {
    assert.equal(
      isOverdue({ nextReviewDate: "2026-08-17T23:00:00+09:00" }, now),
      true,
    );
    assert.equal(
      isDueTodayOrOverdue({ nextReviewDate: "2026-08-18T23:00:00+09:00" }, now),
      true,
    );
    assert.equal(
      isDueTodayOrOverdue({ nextReviewDate: "2026-08-19T00:00:00+09:00" }, now),
      false,
    );
  });
});
