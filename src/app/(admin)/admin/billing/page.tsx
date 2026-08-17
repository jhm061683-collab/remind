import { BillingPanel } from "@/components/admin/billing-panel";
import { PlanCards } from "@/components/billing/plan-cards";
import { PageHeader } from "@/components/ui/page-header";
import {
  getTossClientKey,
  isBillingMockMode,
  isTossBillingConfigured,
} from "@/lib/billing/toss";
import { requireAdmin } from "@/lib/server/admin/auth";
import {
  ensureCustomerKey,
  getAcademyBillingSummary,
  getAcademyIdForAdmin,
  listActivePlans,
  listRecentCharges,
} from "@/lib/server/billing/queries";
import { getSiteUrl } from "@/lib/site-url";
import { redirect } from "next/navigation";

export default async function AdminBillingPage() {
  const session = await requireAdmin();
  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) {
    redirect("/admin/dashboard");
  }

  await ensureCustomerKey(academyId);
  const [summary, plans] = await Promise.all([
    getAcademyBillingSummary(academyId),
    listActivePlans(),
  ]);
  if (!summary) redirect("/admin/dashboard");

  const charges = (await listRecentCharges(academyId)) as Array<{
    id: string;
    order_id: string;
    amount_krw: number;
    student_count: number;
    status: string;
    created_at: string;
    approved_at: string | null;
    failure_message: string | null;
  }>;

  const site = getSiteUrl();
  const mockMode = isBillingMockMode();

  return (
    <>
      <PageHeader
        title="결제 · 구독"
        description="지금 학원에서 쓰는 플랜과 학생 수, 이번 달 사용량을 한눈에 봅니다."
      />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">요금제</h2>
        <PlanCards
          plans={plans.map((p) => ({
            code: p.code,
            name: p.name,
            pricePerStudentKrw: p.pricePerStudentKrw,
            ocrDailyLimit: p.ocrDailyLimit,
            description: p.description,
            highlight: p.highlight,
          }))}
          currentPlanCode={summary.planCode}
          studentCount={summary.studentCount}
          footnote={
            mockMode
              ? "미리보기 환경입니다. 실제 결제는 이루어지지 않습니다."
              : "학생 수 기준으로 매달 청구됩니다. 플랜 변경은 다음 결제일부터 적용됩니다."
          }
        />
      </section>

      <BillingPanel
        summary={summary}
        clientKey={getTossClientKey()}
        configured={isTossBillingConfigured()}
        mockMode={mockMode}
        customerName={session.name}
        successUrl={`${site}/admin/billing/success`}
        failUrl={`${site}/admin/billing/fail`}
        charges={charges}
      />
    </>
  );
}
