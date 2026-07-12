import { AssignmentBoard } from "@/components/admin/assignment-board";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import { getAdminDashboard } from "@/lib/server/admin/queries";

export default async function AssignmentsPage() {
  const session = await requireAdmin();
  const data = await getAdminDashboard(session.id);

  return (
    <>
      <PageHeader
        title="담당 학생 배정"
        description="서브관리자에게 담당 학생을 배정합니다."
      />
      <AssignmentBoard students={data.students} subAdmins={data.subAdmins} />
    </>
  );
}
