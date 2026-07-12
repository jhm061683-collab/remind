import type { SessionUser } from "@/lib/auth/session";
import { unstable_cache } from "next/cache";
import {
  getAdminDashboard,
  getSubAdminDashboard,
} from "@/lib/server/admin/queries";
import type { AdminDashboardData } from "@/lib/types/admin";

export async function getStaffDashboard(
  session: SessionUser,
): Promise<AdminDashboardData> {
  const cached = unstable_cache(
    async () => {
      if (session.role === "sub_admin") {
        return getSubAdminDashboard(session.id);
      }
      return getAdminDashboard(session.id);
    },
    ["staff-dashboard", session.role, session.id],
    { revalidate: 20 },
  );
  return cached();
}
