import { ClassManagementBoard } from "@/components/admin/class-management-board";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import { getClassManagementData } from "@/lib/server/admin/queries";

export default async function AdminClassesPage() {
  const session = await requireAdmin();
  const data = await getClassManagementData(session.id);

  return (
    <>
      <PageHeader
        title="반 관리"
        description="학년별 반을 만들고 담당 선생님·학생을 배정합니다. 한 학생은 여러 반에 들어갈 수 있어요."
      />
      <ClassManagementBoard data={data} />
    </>
  );
}
