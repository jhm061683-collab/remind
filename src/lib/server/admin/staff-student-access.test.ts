import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canStaffAccessStudentRecord } from "./staff-student-access.ts";

const sameAcademy = {
  staffAcademyId: "academy-a",
  studentAcademyId: "academy-a",
  studentRole: "student",
  studentWithdrawn: false,
  isAssigned: true,
};

describe("tenant · 학생 레코드 접근", () => {
  it("같은 학원 원장은 학생 상세 조회 가능", () => {
    assert.equal(
      canStaffAccessStudentRecord({ ...sameAcademy, staffRole: "admin" }),
      true,
    );
  });

  it("다른 학원 학생 ID는 거절", () => {
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "admin",
        studentAcademyId: "academy-b",
      }),
      false,
    );
  });

  it("학원 ID가 없으면 접근을 거절", () => {
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "admin",
        staffAcademyId: null,
      }),
      false,
    );
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "admin",
        studentAcademyId: null,
      }),
      false,
    );
  });

  it("선생님은 미배정 학생 조회 불가", () => {
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "sub_admin",
        isAssigned: false,
      }),
      false,
    );
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "sub_admin",
        isAssigned: true,
      }),
      true,
    );
  });

  it("탈퇴·비학생 프로필은 거절", () => {
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "admin",
        studentRole: "sub_admin",
      }),
      false,
    );
    assert.equal(
      canStaffAccessStudentRecord({
        ...sameAcademy,
        staffRole: "admin",
        studentWithdrawn: true,
      }),
      false,
    );
  });
});
