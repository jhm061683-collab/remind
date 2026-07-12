export type AdminProfile = {
  id: string;
  displayName: string;
  username: string;
  role: "student" | "admin" | "sub_admin";
};

export type AdminStudentRow = {
  id: string;
  displayName: string;
  username: string;
  phone: string | null;
  schoolLevel: "elementary" | "middle" | "high" | "adult" | null;
  gradeNumber: number | null;
  gradeLabel: string | null;
  className: string | null;
  teacherNames: string[];
  subAdminName: string | null;
  subAdminId: string | null;
  lastLoginAt: string | null;
  totalRegistered: number;
  totalReviews: number;
  loginStreakDays: number;
  inactiveDays: number;
  dueToday: number;
  reviewedToday: number;
};

export type SubAdminRow = {
  id: string;
  displayName: string;
  username: string;
  assignedCount: number;
};

export type DailyActivity = {
  date: string;
  label: string;
  count: number;
};

export type AdminDashboardData = {
  totalStudents: number;
  loggedInToday: number;
  activeToday: number;
  shortFulfillmentPct: number | null;
  mediumLongFulfillmentPct: number | null;
  dailyReviews: DailyActivity[];
  students: AdminStudentRow[];
  subAdmins: SubAdminRow[];
};

export type PromotionRule = {
  id: string;
  academyId: string;
  promotionMonth: number;
  promotionDay: number;
  timezone: string;
};

export type StudentDetailData = {
  student: AdminStudentRow;
  weeklyReviews: DailyActivity[];
  topWeaknesses: { reason: string; count: number }[];
};
