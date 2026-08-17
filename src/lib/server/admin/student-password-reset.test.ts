import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideStudentPasswordResetAccess,
  generateTemporaryPassword,
  isTemporaryPasswordExpired,
  isTemporaryPasswordLoginBlocked,
} from "./student-password-reset.ts";

const base = {
  actorAcademyId: "academy-a",
  studentRole: "student",
  studentAcademyId: "academy-a",
  studentWithdrawn: false,
  isAssigned: true,
};

describe("학생 비밀번호 재설정 권한", () => {
  it("원장은 같은 학원 학생을 재설정할 수 있다", () => {
    assert.equal(
      decideStudentPasswordResetAccess({ ...base, actorRole: "admin" }),
      "ok",
    );
  });

  it("원장은 다른 학원 학생을 재설정할 수 없다", () => {
    assert.equal(
      decideStudentPasswordResetAccess({
        ...base,
        actorRole: "admin",
        studentAcademyId: "academy-b",
      }),
      "forbidden",
    );
  });

  it("선생님은 담당 학생만 재설정할 수 있다", () => {
    assert.equal(
      decideStudentPasswordResetAccess({
        ...base,
        actorRole: "sub_admin",
        isAssigned: true,
      }),
      "ok",
    );
    assert.equal(
      decideStudentPasswordResetAccess({
        ...base,
        actorRole: "sub_admin",
        isAssigned: false,
      }),
      "forbidden",
    );
  });

  it("학생은 다른 학생을 재설정할 수 없다", () => {
    assert.equal(
      decideStudentPasswordResetAccess({ ...base, actorRole: "student" }),
      "forbidden",
    );
  });

  it("임시 비밀번호는 평문 목록에 쓰기 어려운 무작위 값이다", () => {
    const first = generateTemporaryPassword();
    const second = generateTemporaryPassword();
    assert.equal(first.length, 10);
    assert.equal(second.length, 10);
    assert.notEqual(first, second);
    assert.match(first, /^[A-Za-z0-9]+$/);
  });

  it("만료 시각이 지나면 임시 비밀번호를 거절한다", () => {
    const now = new Date("2026-08-18T00:00:00.000Z");
    assert.equal(isTemporaryPasswordExpired("2026-08-17T23:00:00.000Z", now), true);
    assert.equal(isTemporaryPasswordExpired("2026-08-18T01:00:00.000Z", now), false);
    assert.equal(isTemporaryPasswordExpired(undefined, now), false);
  });

  it("만료 시각이 없는 임시 비밀번호는 로그인을 막지 않는다", () => {
    const now = new Date("2026-08-18T00:00:00.000Z");
    assert.equal(
      isTemporaryPasswordLoginBlocked({ must_change_password: true }, now),
      false,
    );
    assert.equal(
      isTemporaryPasswordLoginBlocked(
        {
          must_change_password: true,
          must_change_password_expires_at: "2026-08-17T00:00:00.000Z",
        },
        now,
      ),
      true,
    );
    assert.equal(
      isTemporaryPasswordLoginBlocked(
        { must_change_password: false, must_change_password_expires_at: "2026-08-17T00:00:00.000Z" },
        now,
      ),
      false,
    );
  });
});
