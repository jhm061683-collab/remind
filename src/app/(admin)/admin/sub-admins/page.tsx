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
        description="선생님 계정을 만들고, 팀장 권한을 주거나 삭제할 수 있어요. 삭제해도 반은 유지됩니다. 원장 이름·비밀번호는 계정 설정에서 바꿔 주세요."
      />

      <div className="mb-6">
        <CreateUserForm role="sub_admin" title="선생님 계정 추가" />
      </div>

      <SubAdminsList subAdmins={data.subAdmins} />
    </>
  );
}
