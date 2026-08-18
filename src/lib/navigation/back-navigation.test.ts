import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBackNavigation, shouldNavigateBack } from "./back-navigation.ts";

const ORIGIN = "http://localhost:3000";

describe("뒤로가기 판정", () => {
  it("히스토리가 없으면 fallback href를 쓴다", () => {
    assert.equal(
      shouldNavigateBack({
        fallbackHref: "/admin/students",
        referrer: null,
        historyLength: 1,
        origin: ORIGIN,
      }),
      false,
    );
  });

  it("외부 referrer면 fallback href를 쓴다", () => {
    assert.equal(
      shouldNavigateBack({
        fallbackHref: "/archive",
        referrer: "https://example.com/archive",
        historyLength: 3,
        origin: ORIGIN,
      }),
      false,
    );
  });

  it("로그인에서 바로 온 경우 fallback href를 쓴다", () => {
    assert.equal(
      shouldNavigateBack({
        fallbackHref: "/dashboard",
        referrer: `${ORIGIN}/login`,
        historyLength: 2,
        origin: ORIGIN,
      }),
      false,
    );
  });

  it("같은 사이트 archive 목록에서 왔으면 back을 쓴다", () => {
    assert.equal(
      resolveBackNavigation({
        fallbackHref: "/dashboard",
        referrer: `${ORIGIN}/archive?page=2`,
        historyLength: 2,
        origin: ORIGIN,
      }),
      "back",
    );
  });

  it("학생 목록 검색 후 상세에서 back을 쓴다", () => {
    assert.equal(
      resolveBackNavigation({
        fallbackHref: "/admin/students",
        referrer: `${ORIGIN}/admin/students?q=kim&activity=backlog`,
        historyLength: 2,
        origin: ORIGIN,
      }),
      "back",
    );
  });
});
