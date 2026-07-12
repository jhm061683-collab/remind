import { HomeOverview } from "@/components/student/home-overview";
import { getSession } from "@/lib/auth/session";

export default async function StudentDashboardPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";
  const name = session?.name ?? "학생";

  return <HomeOverview userId={userId} userName={name} />;
}
