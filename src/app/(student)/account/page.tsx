import { ChangePasswordForm } from "@/components/account/change-password-form";
import { PageHeader } from "@/components/ui/page-header";

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader title="계정" description="비밀번호를 변경할 수 있습니다." />
      <section className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[var(--rm-text)]">비밀번호 변경</h2>
        <p className="mb-4 text-xs leading-relaxed text-[var(--rm-muted)]">
          변경한 비밀번호는 학원 관리자가 학생 안내용으로 확인할 수 있습니다.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
