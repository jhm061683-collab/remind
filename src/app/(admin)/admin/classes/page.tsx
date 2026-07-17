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
        description="반 → 담당 선생님, 학생 → 반. 선생님은 담당 반의 학생을 자동으로 봅니다. 반별·선생님별로 인원과 명단을 확인하세요."
      />
      <ClassManagementBoard data={data} />
    </>
  );
}
