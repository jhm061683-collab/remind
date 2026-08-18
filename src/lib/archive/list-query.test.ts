import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArchivePage, shouldShowArchiveEmpty } from "./list-query.ts";

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
});
