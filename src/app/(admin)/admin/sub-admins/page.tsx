import { CreateUserForm } from "@/components/admin/create-user-form";
import { SubAdminsList } from "@/components/admin/sub-admins-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";

export default async function SubAdminsPage() {
  const session = await requireAdmin();
  const data = await getStaffDashboard(session);

  return (
    <>
      <PageHeader
        title="서브관리자"
        description="선생님 계정 · 팀장 권한 · 삭제(반은 유지). 원장 이름은 계정 설정에서."
      />

      <div className="mb-4">
        <CreateUserForm role="sub_admin" title="선생님 계정 추가" />
      </div>

      <SubAdminsList subAdmins={data.subAdmins} />
    </>
  );
}
