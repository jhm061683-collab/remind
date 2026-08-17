import { NotificationComposer } from "@/components/admin/notification-composer";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";

export default async function NotificationsPage() {
  const session = await requireStaff();
  const data = await getStaffDashboard(session);

  return (
    <>
      <PageHeader
        title="알림 발송"
        description="학생에게 인앱 알림 + 푸시 발송 (알림을 켠 학생만 푸시 수신)"
      />

      <NotificationComposer students={data.students} />
    </>
  );
}
