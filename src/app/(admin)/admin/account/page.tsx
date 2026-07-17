import { ChangePasswordForm } from "@/components/account/change-password-form";
import { StaffProfileForm } from "@/components/admin/staff-profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";

export default async function AdminAccountPage() {
  const session = await requireStaff();
  const supabase = createServiceClient();
  const { data: me } = await supabase
    .from("profiles")
    .select("display_name, nickname, username, role")
    .eq("id", session.id)
    .maybeSingle();

  const isAdmin = (me?.role ?? session.role) === "admin";

  return (
    <>
      <PageHeader
        title="계정 설정"
        description="표시 이름과 비밀번호를 바꿀 수 있어요."
      />

      <div className="mx-auto max-w-lg space-y-4">
        <StaffProfileForm
          displayName={me?.display_name ?? session.name}
          nickname={(me?.nickname as string | null) ?? null}
          username={(me?.username as string | null) ?? null}
          isAdmin={isAdmin}
        />

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-semibold text-zinc-900">비밀번호 변경</h2>
          <p className="mb-4 text-xs text-zinc-500">
            현재 비밀번호를 확인한 뒤 새 비밀번호로 바꿉니다.
          </p>
          <ChangePasswordForm
            successHint="비밀번호를 변경했습니다."
            revalidatePath="/admin/account"
          />
        </section>
      </div>
    </>
  );
}
