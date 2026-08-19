import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  archiveStatHref,
  parseArchiveFilters,
  parseArchivePage,
  shouldShowArchiveEmpty,
} from "./list-query.ts";

describe("보관함 목록 상태", () => {
  it("로딩 중에는 빈 화면을 보여주지 않는다", () => {
    assert.equal(shouldShowArchiveEmpty("loading", 0), false);
    assert.equal(shouldShowArchiveEmpty("error", 0), false);
    assert.equal(shouldShowArchiveEmpty("ready", 0), true);
    assert.equal(shouldShowArchiveEmpty("ready", 90), false);
  });

  it("잘못된 page 값을 보정한다", () => {
    assert.equal(parseArchivePage("2", 4), 2);
    assert.equal(parseArchivePage("-1", 4), 1);
    assert.equal(parseArchivePage("99", 2), 2);
    assert.equal(parseArchivePage("abc", 3), 1);
  });

  it("검색·과목·기간·다중 분류를 URL에서 복원한다", () => {
    const filters = parseArchiveFilters(
      new URLSearchParams(
        "q=함수&subject=math&from=2026-08-01&to=2026-08-19&reason=계산+실수&reason=개념+혼동&wrongKeyword=부호",
      ),
    );
    assert.equal(filters.q, "함수");
    assert.equal(filters.subject, "math");
    assert.deepEqual(filters.reasons, ["계산 실수", "개념 혼동"]);
    assert.deepEqual(filters.wrongKeywords, ["부호"]);
    assert.equal(filters.from, "2026-08-01");
    assert.equal(filters.to, "2026-08-19");
  });

  it("홈 통계 네 항목을 의미가 일치하는 보관함 URL로 연결한다", () => {
    assert.equal(archiveStatHref("all"), "/archive");
    assert.equal(archiveStatHref("active"), "/archive?status=active");
    assert.equal(archiveStatHref("mastered"), "/archive?status=archived");
    assert.equal(archiveStatHref("upcoming"), "/archive?status=upcoming");
  });
});
