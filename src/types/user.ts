export type UserRole = "student" | "admin" | "sub_admin" | "platform_admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  academyId: string;
  assignedSubAdminId?: string;
};

/** 플랫폼(최종) 관리자 로그인용 특수 학원 코드 */
export const PLATFORM_LOGIN_CODE = "PLATFORM";

/** 데모 학원 기본 코드 */
export const DEMO_ACADEMY_CODE = "DEMO";
