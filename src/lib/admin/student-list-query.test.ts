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
        assignment: "all",
        page: 1,
      },
    );
    assert.equal(href.includes("q=%EA%B9%80") || href.includes("q=김"), true);
    assert.ok(href.includes("scope=assigned"));
    assert.ok(href.includes("activity=due_today"));
  });

  it("반 미배정 필터를 URL에 보존하고 잘못된 값은 무시한다", () => {
    const parsed = parseStudentListQuery(
      new URLSearchParams("assignment=unassigned"),
    );
    assert.equal(parsed.assignment, "unassigned");
    assert.ok(
      studentListHref({ page: 1 }, parsed).includes("assignment=unassigned"),
    );
    assert.equal(
      parseStudentListQuery(new URLSearchParams("assignment=other")).assignment,
      "all",
    );
  });

  it("장기 미접속·미로그인 통합 필터를 보존한다", () => {
    const parsed = parseStudentListQuery(
      new URLSearchParams("activity=inactive_or_never&page=2"),
    );
    assert.equal(parsed.activity, "inactive_or_never");
    assert.equal(parsed.page, 2);
  });
});
