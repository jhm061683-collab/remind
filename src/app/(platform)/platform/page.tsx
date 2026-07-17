import { AcademyStatusActions } from "@/components/platform/academy-status-actions";
import { CreateAcademyForm } from "@/components/platform/create-academy-form";
import { CreateInviteForm } from "@/components/platform/create-invite-form";
import { InviteList } from "@/components/platform/invite-list";
import { PageHeader } from "@/components/ui/page-header";
import { formatKrw } from "@/lib/billing/pricing";
import { requirePlatformAdmin } from "@/lib/server/platform/auth";
import {
  listAcademyInvites,
  listPlatformAcademies,
  listSubscriptionPlans,
} from "@/lib/server/platform/queries";

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ko-KR");
  } catch {
    return "—";
  }
}

export default async function PlatformHomePage() {
  await requirePlatformAdmin();
  const [academies, plans, invites] = await Promise.all([
    listPlatformAcademies(),
    listSubscriptionPlans(),
    listAcademyInvites(),
  ]);

  return (
    <>
      <PageHeader
        title="학원 관리"
        description="초대 링크로 원장을 모집하고, 월 요금은 학생 수 × 단가로 계산합니다."
      />

      <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="mb-1 text-sm font-semibold">원장 초대 링크</h2>
        <p className="mb-3 text-xs text-[var(--rm-text-muted)]">
          학원 코드와 학생당 단가를 정해 링크를 만들고, 원장에게 보내세요.
        </p>
        <CreateInviteForm />
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold text-[var(--rm-text-muted)]">
            최근 초대
          </h3>
          <InviteList invites={invites} />
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold">직접 학원 추가 (선택)</h2>
        <CreateAcademyForm
          plans={plans.map((p) => ({ code: p.code, name: p.name }))}
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">단가 참고</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"
            >
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-1 text-sm text-[var(--rm-text-muted)]">
                {formatKrw(plan.pricePerStudentKrw)} / 학생·월
              </p>
              <p className="mt-2 text-xs text-[var(--rm-text-faint)]">
                예: 학생 50명 →{" "}
                {formatKrw(50 * plan.pricePerStudentKrw)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">
          등록 학원 ({academies.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--rm-border)] text-xs text-[var(--rm-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">학원</th>
                <th className="px-4 py-3 font-medium">코드</th>
                <th className="px-4 py-3 font-medium">원장</th>
                <th className="px-4 py-3 font-medium">학생</th>
                <th className="px-4 py-3 font-medium">단가</th>
                <th className="px-4 py-3 font-medium">이번 달 예상</th>
                <th className="px-4 py-3 font-medium">카드</th>
                <th className="px-4 py-3 font-medium">구독</th>
                <th className="px-4 py-3 font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {academies.map((academy) => (
                <tr
                  key={academy.id}
                  className="border-b border-[var(--rm-border)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{academy.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{academy.code}</td>
                  <td className="px-4 py-3">{academy.adminName ?? "—"}</td>
                  <td className="px-4 py-3">{academy.studentCount}</td>
                  <td className="px-4 py-3 text-xs">
                    {formatKrw(academy.pricePerStudentKrw)}/명
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatKrw(academy.estimatedMonthlyKrw)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {academy.hasBillingKey
                      ? academy.cardNumberMasked || "등록됨"
                      : "미등록"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--rm-text-muted)]">
                    {academy.subscriptionStatus ?? "—"}
                    <br />
                    ~{formatDate(academy.periodEnd)}
                  </td>
                  <td className="px-4 py-3">
                    <AcademyStatusActions
                      academyId={academy.id}
                      status={academy.status}
                    />
                  </td>
                </tr>
              ))}
              {academies.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-[var(--rm-text-muted)]"
                  >
                    아직 학원이 없습니다. 초대 링크로 원장을 모집해 보세요.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
