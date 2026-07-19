import { AcademyPlanSelect } from "@/components/platform/academy-plan-select";
import { AcademyStatusActions } from "@/components/platform/academy-status-actions";
import { DirectorPasswordReset } from "@/components/platform/director-password-reset";
import { CreateAcademyForm } from "@/components/platform/create-academy-form";
import { CreateInviteForm } from "@/components/platform/create-invite-form";
import { InviteList } from "@/components/platform/invite-list";
import { PlanCards } from "@/components/billing/plan-cards";
import { PageHeader } from "@/components/ui/page-header";
import { formatKrw } from "@/lib/billing/pricing";
import { requirePlatformAdmin } from "@/lib/server/platform/auth";
import {
  listAcademyInvites,
  listPlatformAcademies,
  listSubscriptionPlans,
} from "@/lib/server/platform/queries";
import { getPlatformAiCostSummary } from "@/lib/server/ai/cost";
import { AiCostPanel } from "@/components/platform/ai-cost-panel";

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
  const [academies, plans, invites, aiCost] = await Promise.all([
    listPlatformAcademies(),
    listSubscriptionPlans(),
    listAcademyInvites(),
    getPlatformAiCostSummary(),
  ]);

  const planOptions = plans.map((p) => ({
    code: p.code,
    name: p.name,
    pricePerStudentKrw: p.pricePerStudentKrw,
    ocrDailyLimit: p.ocrDailyLimit,
    description: p.description,
    highlight: p.highlight,
  }));

  return (
    <>
      <PageHeader
        title="학원 관리"
        description="학원 코드(영문·숫자 4~12) · Basic/Pro/Premium · owner가 플랜 변경(일할계산)"
      />

      <AiCostPanel summary={aiCost} />

      <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="mb-1 text-sm font-semibold">원장 초대 링크</h2>
        <p className="mb-3 text-xs text-[var(--rm-text-muted)]">
          학원 코드와 시작 요금제를 정해 링크를 만드세요.
        </p>
        <CreateInviteForm />
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold text-[var(--rm-text-muted)]">
            최근 초대
          </h3>
          <InviteList invites={invites} />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">요금제</h2>
        <PlanCards plans={planOptions} />
      </section>

      <section className="mb-8 rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold">직접 학원 추가 (선택)</h2>
        <CreateAcademyForm
          plans={plans.map((p) => ({ code: p.code, name: p.name }))}
        />
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
                <th className="px-4 py-3 font-medium">요금제</th>
                <th className="px-4 py-3 font-medium">이번 달 예상</th>
                <th className="px-4 py-3 font-medium">카드</th>
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
                  <td className="px-4 py-3">
                    <p>{academy.adminName ?? "—"}</p>
                    {academy.adminUsername ? (
                      <p className="text-[11px] text-[var(--rm-text-faint)]">
                        @{academy.adminUsername}
                      </p>
                    ) : null}
                    <div className="mt-1">
                      <DirectorPasswordReset
                        academyId={academy.id}
                        directorUserId={academy.adminId}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">{academy.studentCount}</td>
                  <td className="px-4 py-3">
                    <AcademyPlanSelect
                      academyId={academy.id}
                      currentPlanCode={academy.planCode}
                      plans={plans.map((p) => ({
                        code: p.code,
                        name: p.name,
                      }))}
                    />
                    <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
                      {formatKrw(academy.pricePerStudentKrw)}/명
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatKrw(academy.estimatedMonthlyKrw)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {academy.hasBillingKey
                      ? academy.cardNumberMasked || "등록됨"
                      : "미등록"}
                  </td>
                  <td className="px-4 py-3">
                    <AcademyStatusActions
                      academyId={academy.id}
                      status={academy.status}
                    />
                    <p className="mt-1 text-[11px] text-[var(--rm-text-faint)]">
                      {academy.subscriptionStatus ?? "—"} · ~
                      {formatDate(academy.periodEnd)}
                    </p>
                  </td>
                </tr>
              ))}
              {academies.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
