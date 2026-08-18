/**
 * 스태프 → 학생 레코드 접근 규칙 (순수 함수).
 * staffCanAccessStudent와 동일한 정책을 테스트·재사용한다.
 */
export function canStaffAccessStudentRecord(input: {
  staffRole: "admin" | "sub_admin";
  staffAcademyId: string | null;
  studentRole: string;
  studentAcademyId: string | null;
  studentWithdrawn: boolean;
  isAssigned: boolean;
}): boolean {
  if (input.studentRole !== "student") return false;
  if (input.studentWithdrawn) return false;
  if (!input.staffAcademyId || !input.studentAcademyId) return false;
  if (input.staffAcademyId !== input.studentAcademyId) return false;
  if (input.staffRole === "admin") return true;
  return input.isAssigned;
}
