import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAutoHidden,
  mergeHiddenPreference,
  prefsAfterManualReplay,
  shouldAutoShow,
} from "./preferences.ts";
import {
  firstAvailableIndex,
  nextAvailableIndex,
  placeTooltip,
} from "./geometry.ts";
import { shouldPreventTouchMove } from "./scroll-lock.ts";
import { findMatchingTutorials, tutorialByKey } from "./catalog.ts";

describe("tutorial auto-hide policy", () => {
  it("CASE 1: 신규 계정은 자동 튜토리얼을 본다", () => {
    assert.equal(
      shouldAutoShow({ key: "student_home", version: 1 }, []),
      true,
    );
  });

  it("CASE 2: 닫기만 하면 숨김 상태가 생기지 않는다", () => {
    const prefs = [];
    assert.equal(
      shouldAutoShow({ key: "student_home", version: 1 }, prefs),
      true,
    );
  });

  it("CASE 3-4: 다시 보지 않기는 계정 기준으로 숨긴다", () => {
    const prefs = mergeHiddenPreference([], {
      key: "student_home",
      version: 1,
    });
    assert.equal(
      shouldAutoShow({ key: "student_home", version: 1 }, prefs),
      false,
    );
    assert.equal(isAutoHidden({ key: "student_home", version: 1 }, prefs), true);
  });

  it("CASE 6: 수동 재생은 auto_hidden 을 해제하지 않는다", () => {
    const hidden = mergeHiddenPreference([], {
      key: "student_home",
      version: 1,
    });
    const afterReplay = prefsAfterManualReplay(hidden);
    assert.equal(
      isAutoHidden({ key: "student_home", version: 1 }, afterReplay),
      true,
    );
  });

  it("숨김은 false 로 되돌아가지 않는다", () => {
    const once = mergeHiddenPreference([], { key: "student_home", version: 1 });
    const twice = mergeHiddenPreference(once, {
      key: "student_home",
      version: 1,
    });
    assert.equal(twice.length, 1);
    assert.equal(twice[0]?.autoHidden, true);
  });

  it("CASE 10: 버전을 올리면 새 튜토리얼을 다시 보여줄 수 있다", () => {
    const prefs = mergeHiddenPreference([], {
      key: "student_home",
      version: 1,
    });
    assert.equal(
      shouldAutoShow({ key: "student_home", version: 1 }, prefs),
      false,
    );
    assert.equal(
      shouldAutoShow({ key: "student_home", version: 2 }, prefs),
      true,
    );
  });
});

describe("tour step skip / placement", () => {
  it("CASE 7: 없는 target step 은 건너뛴다", () => {
    const missing = [true, false, true, false];
    assert.equal(firstAvailableIndex(missing), 1);
    assert.equal(nextAvailableIndex(1, missing, 1), 3);
    assert.equal(nextAvailableIndex(3, missing, 1), null);
    assert.equal(nextAvailableIndex(1, missing, -1), null);
  });

  it("CASE 8: 모바일에서 위쪽 target 은 카드를 아래에 둔다", () => {
    const placed = placeTooltip({
      target: { top: 40, left: 20, width: 200, height: 48, bottom: 88, right: 220 },
      viewport: { width: 390, height: 720, offsetTop: 0, offsetLeft: 0 },
      tooltipWidth: 320,
      tooltipHeight: 220,
      isMobile: true,
    });
    assert.equal(placed.placement, "below");
    assert.ok(placed.y >= 88);
    assert.ok(placed.y <= 88 + 16);
  });

  it("모바일에서 아래쪽 target 은 카드를 위에 둔다", () => {
    const placed = placeTooltip({
      target: {
        top: 620,
        left: 16,
        width: 358,
        height: 56,
        bottom: 676,
        right: 374,
      },
      viewport: { width: 390, height: 720, offsetTop: 0, offsetLeft: 0 },
      tooltipWidth: 320,
      tooltipHeight: 220,
      isMobile: true,
    });
    assert.equal(placed.placement, "above");
    assert.ok(placed.y + 220 <= 620);
    assert.ok(placed.y + 220 >= 620 - 16);
  });

  it("공간이 부족하면 대상 위에 겹쳐서라도 가까이 둔다", () => {
    const target = {
      top: 150,
      left: 20,
      width: 350,
      height: 300,
      bottom: 450,
      right: 370,
    };
    const placed = placeTooltip({
      target,
      viewport: { width: 390, height: 600, offsetTop: 0, offsetLeft: 0 },
      tooltipWidth: 320,
      tooltipHeight: 260,
      isMobile: true,
    });
    assert.notEqual(placed.placement, "sheet" as string);
    const cardBottom = placed.y + 260;
    const overlaps =
      placed.y < target.bottom && cardBottom > target.top;
    const near =
      placed.y <= target.bottom + 16 && cardBottom >= target.top - 16;
    assert.ok(overlaps || near, "카드가 대상에서 멀리 떨어지면 안 됨");
    assert.ok(placed.y >= 12);
    assert.ok(cardBottom <= 600 - 12);
  });

  it("CASE 9: 툴팁이 viewport 밖으로 나가지 않는다", () => {
    const placed = placeTooltip({
      target: { top: 10, left: 0, width: 80, height: 40, bottom: 50, right: 80 },
      viewport: { width: 390, height: 700, offsetTop: 0, offsetLeft: 0 },
      tooltipWidth: 360,
      tooltipHeight: 240,
      isMobile: false,
    });
    assert.ok(placed.x >= 12);
    assert.ok(placed.x + placed.width <= 390 - 12);
  });
});

describe("iOS 스크롤 체인 차단", () => {
  it("설명 카드 밖 터치는 막는다", () => {
    assert.equal(shouldPreventTouchMove(null, 12), true);
  });

  it("카드가 스크롤 불가면 배경으로 넘기지 않는다", () => {
    const dialog = {
      scrollTop: 0,
      scrollHeight: 180,
      clientHeight: 180,
    } as HTMLElement;
    assert.equal(shouldPreventTouchMove(dialog, 20), true);
    assert.equal(shouldPreventTouchMove(dialog, -20), true);
  });

  it("카드 맨 위에서 아래로 당기면 막는다", () => {
    const dialog = {
      scrollTop: 0,
      scrollHeight: 400,
      clientHeight: 180,
    } as HTMLElement;
    assert.equal(shouldPreventTouchMove(dialog, 18), true);
    assert.equal(shouldPreventTouchMove(dialog, -18), false);
  });

  it("카드 맨 아래에서 위로 밀면 막는다", () => {
    const dialog = {
      scrollTop: 220,
      scrollHeight: 400,
      clientHeight: 180,
    } as HTMLElement;
    assert.equal(shouldPreventTouchMove(dialog, -12), true);
    assert.equal(shouldPreventTouchMove(dialog, 12), false);
  });
});

describe("role catalog", () => {
  it("학생/원장/선생님 튜토리얼이 분리된다", () => {
    assert.equal(tutorialByKey("student_home")?.role, "student");
    assert.equal(tutorialByKey("admin_home")?.role, "admin");
    assert.equal(tutorialByKey("teacher_home")?.role, "sub_admin");
    const adminDash = findMatchingTutorials("admin", "/admin/dashboard");
    const teacherDash = findMatchingTutorials("sub_admin", "/admin/dashboard");
    assert.equal(adminDash[0]?.key, "admin_home");
    assert.equal(teacherDash[0]?.key, "teacher_home");
  });
});
