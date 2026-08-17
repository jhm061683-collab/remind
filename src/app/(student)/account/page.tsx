import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PushNotificationSettings } from "@/components/account/push-notification-settings";
import { ReplayTutorials } from "@/components/tutorial/replay-tutorials";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";

export default async function AccountPage() {
  const session = await getSession();
  const mustChange = Boolean(session?.mustChangePassword);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        title="계정"
        description="비밀번호와 휴대폰 알림을 설정할 수 있어요."
      />
      {mustChange ? (
        <p
          className="rounded-xl border border-[var(--rm-warning)] bg-[color-mix(in_srgb,var(--rm-warning)_12%,var(--rm-surface))] px-3 py-2 text-sm text-[var(--rm-text)]"
          role="status"
        >
          임시 비밀번호로 로그인했습니다. 계속 쓰려면 새 비밀번호로 바꿔 주세요.
        </p>
      ) : null}
      <ReplayTutorials compact />
      <PushNotificationSettings />
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[var(--rm-text)]">
          비밀번호 변경
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-[var(--rm-muted)]">
          비밀번호는 안전하게 저장되며 학원 관리자도 확인할 수 없습니다.
          비밀번호를 잊은 경우 재설정이 필요합니다.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
