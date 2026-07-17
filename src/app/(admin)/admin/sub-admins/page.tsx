import { CreateUserForm } from "@/components/admin/create-user-form";
import { DirectorProfileForm } from "@/components/admin/director-profile-form";
import { SubAdminsList } from "@/components/admin/sub-admins-list";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import { getStaffDashboard } from "@/lib/server/admin/dashboard";
import { createServiceClient } from "@/lib/supabase/service";

export default async function SubAdminsPage() {
  const session = await requireAdmin();
  const data = await getStaffDashboard(session);

  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, nickname, username")
    .eq("id", session.id)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="서브관리자 관리"
        description="원장 표시 이름을 바꾸고, 선생님 계정을 만들 수 있어요. 원장 지정은 그 선생님에게 관리자 모드를 열어 주는 권한입니다(계정 합치기 아님)."
      />

      <div className="mb-6 space-y-4">
        <DirectorProfileForm
          displayName={me?.display_name ?? session.name}
          nickname={(me?.nickname as string | null) ?? null}
          username={(me?.username as string | null) ?? null}
        />
        <CreateUserForm role="sub_admin" title="서브관리자 계정 추가" />
      </div>

      <SubAdminsList subAdmins={data.subAdmins} />
    </>
  );
}
