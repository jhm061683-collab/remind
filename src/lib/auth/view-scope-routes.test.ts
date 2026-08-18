import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionUser } from "./session";
import {
  getEffectiveStaffRoleForData,
  isOrganizationScopePath,
  isStudentLearningScopePath,
  resolveDataViewScope,
  showsViewScopeSwitch,
} from "./view-scope-routes";

function session(
  patch: Partial<SessionUser> & Pick<SessionUser, "role">,
): SessionUser {
  return { id: "u1", name: "테스트", ...patch };
}

describe("view scope 경로 정책", () => {
  it("학습 운영 경로만 student-learning scope 대상이다", () => {
    assert.equal(isStudentLearningScopePath("/admin/dashboard"), true);
    assert.equal(isStudentLearningScopePath("/admin/students"), true);
    assert.equal(
      isStudentLearningScopePath("/admin/students/abc-123"),
      true,
    );
    assert.equal(isStudentLearningScopePath("/admin/notifications"), true);
    assert.equal(isStudentLearningScopePath("/admin/sub-admins"), false);
    assert.equal(isOrganizationScopePath("/admin/classes"), true);
    assert.equal(isOrganizationScopePath("/admin/billing"), true);
    assert.equal(isOrganizationScopePath("/admin/account"), true);
  });

  it("조직 관리 경로에서는 scope 토글을 숨긴다", () => {
    assert.equal(showsViewScopeSwitch("/admin/dashboard"), true);
    assert.equal(showsViewScopeSwitch("/admin/sub-admins"), false);
    assert.equal(showsViewScopeSwitch("/admin/classes"), false);
  });

  it("원장 내 담당 상태여도 sub-admins는 academy scope로 정규화한다", () => {
    const director = session({ role: "admin", viewScope: "assigned" });
    assert.equal(
      resolveDataViewScope(director, "assigned", "/admin/sub-admins"),
      "academy",
    );
    assert.equal(
      getEffectiveStaffRoleForData(director, "assigned", "/admin/sub-admins"),
      "admin",
    );
  });

  it("원장 내 담당은 학생 목록에서만 sub_admin 역할로 필터한다", () => {
    const director = session({ role: "admin", viewScope: "assigned" });
    assert.equal(
      resolveDataViewScope(director, "assigned", "/admin/students"),
      "assigned",
    );
    assert.equal(
      getEffectiveStaffRoleForData(director, "assigned", "/admin/students"),
      "sub_admin",
    );
  });

  it("URL scope=assigned가 조직 경로에 있어도 academy로 정규화한다", () => {
    const director = session({ role: "admin", viewScope: "academy" });
    assert.equal(
      resolveDataViewScope(director, "assigned", "/admin/sub-admins"),
      "academy",
    );
  });
});
