import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionUser } from "../session.ts";
import {
  canSwitchViewScope,
  getAuthenticatedStaffRole,
  getEffectiveStaffRole,
  resolveViewScope,
} from "./staff-mode.ts";

function session(
  patch: Partial<SessionUser> & Pick<SessionUser, "role">,
): SessionUser {
  return { id: "u1", name: "테스트", ...patch };
}

describe("원장 보기 범위", () => {
  it("원장의 인증 역할은 내 담당을 켜도 admin이다", () => {
    const director = session({
      role: "admin",
      viewScope: "assigned",
      staffMode: "teacher",
    });
    assert.equal(getAuthenticatedStaffRole(director), "admin");
    assert.equal(resolveViewScope(director), "assigned");
    assert.equal(getEffectiveStaffRole(director), "sub_admin");
    assert.equal(canSwitchViewScope(director), true);
  });

  it("URL scope가 쿠키보다 우선한다", () => {
    const director = session({ role: "admin", viewScope: "academy" });
    assert.equal(resolveViewScope(director, "assigned"), "assigned");
    assert.equal(resolveViewScope(director, "academy"), "academy");
  });

  it("선생님은 보기 범위를 학원 전체로 올릴 수 없다", () => {
    const teacher = session({
      role: "sub_admin",
      isDirector: true,
      viewScope: "academy",
      staffMode: "admin",
    });
    assert.equal(canSwitchViewScope(teacher), false);
    assert.equal(getAuthenticatedStaffRole(teacher), "sub_admin");
    assert.equal(resolveViewScope(teacher, "academy"), "assigned");
    assert.equal(getEffectiveStaffRole(teacher), "sub_admin");
  });

  it("예전 staffMode 값도 보기 범위로 읽는다", () => {
    const director = session({ role: "admin", staffMode: "teacher" });
    assert.equal(resolveViewScope(director), "assigned");
  });
});
