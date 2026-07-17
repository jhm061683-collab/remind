import type { SessionUser } from "@/lib/auth/session";
import { getEffectiveStaffRole } from "@/lib/auth/staff-mode";
import { unstable_cache } from "next/cache";
import {
  getAdminDashboard,
  getSubAdminDashboard,
} from "@/lib/server/admin/queries";
import type { AdminDashboardData } from "@/lib/types/admin";

export async function getStaffDashboard(
  session: SessionUser,
): Promise<AdminDashboardData> {
  const effective = getEffectiveStaffRole(session);
  const cached = unstable_cache(
    async () => {
      if (effective === "sub_admin") {
        return getSubAdminDashboard(session.id);
      }
      return getAdminDashboard(session.id);
    },
    ["staff-dashboard", effective, session.id, session.staffMode ?? ""],
    { revalidate: 20 },
  );
  return cached();
}
