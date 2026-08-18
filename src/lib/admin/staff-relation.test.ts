import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeStaffing,
  missingStaffProfileIds,
  staffAccessLabel,
} from "./staff-relation.ts";

describe("담당 표시", () => {
  it("직접 배정이 주 담당이다", () => {
    const described = describeStaffing({
      teacherNames: ["이선생", "김선생"],
      subAdminName: "이선생",
    });
    assert.equal(described.primary, "이선생");
    assert.deepEqual(described.others, ["김선생"]);
    assert.ok(described.label.includes("공동"));
  });

  it("배정이 없으면 미배정이다", () => {
    const described = describeStaffing({ teacherNames: [], subAdminName: null });
    assert.equal(described.label, "미배정");
  });

  it("접근 이유 문구가 역할별로 다르다", () => {
    assert.equal(staffAccessLabel("primary"), "주 담당");
    assert.equal(staffAccessLabel("academy"), "학원 전체");
  });

  it("상세 조회도 직접 배정 담당자 프로필을 빠뜨리지 않는다", () => {
    const missing = missingStaffProfileIds(
      ["student", "class-teacher"],
      ["class-teacher", "direct-teacher", "direct-teacher"],
    );
    assert.deepEqual(missing, ["direct-teacher"]);
  });
});
