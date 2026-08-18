import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccessAdminPath, isAdminOnlyPath } from "./admin-nav.ts";

describe("관리자 경로 권한", () => {
  it("선생님은 admin-only 경로에 접근할 수 없다", () => {
    assert.equal(isAdminOnlyPath("/admin/classes"), true);
    assert.equal(canAccessAdminPath("sub_admin", "/admin/classes"), false);
    assert.equal(canAccessAdminPath("sub_admin", "/admin/billing"), false);
    assert.equal(canAccessAdminPath("sub_admin", "/admin/sub-admins"), false);
  });

  it("선생님은 담당 업무 경로에는 접근할 수 있다", () => {
    assert.equal(canAccessAdminPath("sub_admin", "/admin/dashboard"), true);
    assert.equal(canAccessAdminPath("sub_admin", "/admin/students"), true);
    assert.equal(canAccessAdminPath("sub_admin", "/admin/notifications"), true);
  });

  it("학생은 관리자 영역에 접근할 수 없다", () => {
    assert.equal(canAccessAdminPath("student", "/admin/dashboard"), false);
    assert.equal(canAccessAdminPath("student", "/admin/students"), false);
  });

  it("원장은 admin-only 경로에 접근할 수 있다", () => {
    assert.equal(canAccessAdminPath("admin", "/admin/classes"), true);
    assert.equal(canAccessAdminPath("admin", "/admin/billing"), true);
  });
});
