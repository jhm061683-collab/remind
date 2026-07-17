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
        title="서브관리자 관리"
        description="선생님 계정을 만들고, 필요하면 원장으로 지정해 관리자 모드 전환을 열어 줍니다."
      />

      <div className="mb-6">
        <CreateUserForm role="sub_admin" title="서브관리자 계정 추가" />
      </div>

      <SubAdminsList subAdmins={data.subAdmins} />
    </>
  );
}
