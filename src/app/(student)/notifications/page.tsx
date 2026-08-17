import { StudentNotificationsPanel } from "@/components/student/student-notifications-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { getStudentNotifications } from "@/lib/server/student/notifications";
import { isSupabaseUserId } from "@/lib/supabase/config";
import { redirect } from "next/navigation";

export default async function StudentNotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/login");
  }

  const items =
    session.id && isSupabaseUserId(session.id)
      ? await getStudentNotifications(session.id)
      : [];

  return (
    <>
      <PageHeader
        title="학원 알림"
        description="원장님이 보낸 공지를 모아 봅니다"
        compact
      />
      <StudentNotificationsPanel items={items} />
    </>
  );
}
