import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTemporaryOrientationMode } from "./orientation-support.ts";

describe("임시 가로 보기 지원 판정", () => {
  it("fullscreen과 orientation lock이 모두 있을 때만 lock을 사용한다", () => {
    assert.equal(
      getTemporaryOrientationMode({ fullscreen: true, orientationLock: true }),
      "lock",
    );
    assert.equal(
      getTemporaryOrientationMode({ fullscreen: true, orientationLock: false }),
      "fullscreen-only",
    );
    assert.equal(
      getTemporaryOrientationMode({ fullscreen: false, orientationLock: true }),
      "fullscreen-only",
    );
  });
});
