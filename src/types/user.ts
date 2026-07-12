export type UserRole = "student" | "admin" | "sub_admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  academyId: string;
  assignedSubAdminId?: string;
};
