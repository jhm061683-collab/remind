import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseStudentListQuery, studentListHref } from "./student-list-query.ts";

describe("학생 목록 URL", () => {
  it("잘못된 activity와 page를 기본값으로 보정한다", () => {
    const parsed = parseStudentListQuery(new URLSearchParams("activity=hack&page=-3"));
    assert.equal(parsed.activity, "all");
    assert.equal(parsed.page, 1);
  });

  it("검색과 scope를 쿼리에 넣는다", () => {
    const href = studentListHref(
      { q: "김", scope: "assigned", activity: "due_today" },
      {
        q: "",
        className: "all",
        grade: "all",
        teacher: "all",
        activity: "all",
        page: 1,
      },
    );
    assert.equal(href.includes("q=%EA%B9%80") || href.includes("q=김"), true);
    assert.ok(href.includes("scope=assigned"));
    assert.ok(href.includes("activity=due_today"));
  });
});
