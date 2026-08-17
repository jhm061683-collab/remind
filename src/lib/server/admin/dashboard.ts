import type { SessionUser } from "@/lib/auth/session";
import { getEffectiveStaffRole, resolveViewScope } from "@/lib/auth/staff-mode";
import { unstable_cache } from "next/cache";
import {
  getAdminClassOptions,
  getAdminDashboard,
  getAdminStudentList,
  getSubAdminDashboard,
  getSubAdminStudentList,
} from "@/lib/server/admin/queries";
import type { AdminDashboardData, AdminStudentRow, ClassOption } from "@/lib/types/admin";

export async function getStaffDashboard(
  session: SessionUser,
  urlScope?: string | null,
): Promise<AdminDashboardData> {
  const effective = getEffectiveStaffRole(session, urlScope);
  const scope = resolveViewScope(session, urlScope);
  const cached = unstable_cache(
    async () => {
      if (effective === "sub_admin") {
        return getSubAdminDashboard(session.id);
      }
      return getAdminDashboard(session.id);
    },
    ["staff-dashboard", effective, session.id, scope],
    { revalidate: 20 },
  );
  return cached();
}

/** 학생 설정 목록/보고서용 슬림 목록 (대시보드 풀스캔 회피) */
export async function getStaffStudentList(
  session: SessionUser,
  urlScope?: string | null,
): Promise<AdminStudentRow[]> {
  const effective = getEffectiveStaffRole(session, urlScope);
  const scope = resolveViewScope(session, urlScope);
  const cached = unstable_cache(
    async () => {
      if (effective === "sub_admin") {
        return getSubAdminStudentList(session.id);
      }
      return getAdminStudentList(session.id);
    },
    ["staff-student-list", effective, session.id, scope],
    { revalidate: 20 },
  );
  return cached();
}

export async function getCachedAdminClassOptions(
  adminId: string,
): Promise<ClassOption[]> {
  const cached = unstable_cache(
    async () => getAdminClassOptions(adminId),
    ["admin-class-options", adminId],
    { revalidate: 60 },
  );
  return cached();
}
