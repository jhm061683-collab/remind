import type { UserRole } from "@/types/user";

export type AuthUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
};

/** 데모용 계정 (추후 DB로 교체) */
export const DEMO_USERS: AuthUser[] = [
  {
    id: "student-1",
    username: "student",
    password: "student123",
    name: "김학생",
    role: "student",
  },
  {
    id: "admin-1",
    username: "admin",
    password: "admin123",
    name: "장현문",
    role: "admin",
  },
  {
    id: "sub-1",
    username: "teacher",
    password: "teacher123",
    name: "이선생",
    role: "sub_admin",
  },
];

export function verifyUser(
  username: string,
  password: string,
): AuthUser | null {
  const normalized = username.trim().toLowerCase();
  return (
    DEMO_USERS.find(
      (user) =>
        user.username === normalized && user.password === password,
    ) ?? null
  );
}

export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "sub_admin":
      return "/admin/dashboard";
    default:
      return "/dashboard";
  }
}
