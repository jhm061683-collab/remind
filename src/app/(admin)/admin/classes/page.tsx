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
        description="선생님은 반에, 학생은 반에 배정 · 반 학생은 담당 선생님에게 자동 표시"
      />
      <ClassManagementBoard data={data} />
    </>
  );
}
