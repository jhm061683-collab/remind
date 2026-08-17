import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PushNotificationSettings } from "@/components/account/push-notification-settings";
import { ReplayTutorials } from "@/components/tutorial/replay-tutorials";
import { PageHeader } from "@/components/ui/page-header";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        title="계정"
        description="비밀번호와 휴대폰 알림을 설정할 수 있어요."
      />
      <ReplayTutorials compact />
      <PushNotificationSettings />
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[var(--rm-text)]">
          비밀번호 변경
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-[var(--rm-muted)]">
          비밀번호를 잊었을 때 학원 선생님이 안내할 수 있도록, 학원 관리자
          화면에도 새 비밀번호가 보여요. 친구에게 알려 주지 마세요.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
