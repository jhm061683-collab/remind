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
        description="요금제는 ChatGPT처럼 Basic / Pro / Premium 입니다. 변경은 플랫폼(owner)에서 합니다."
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
          footnote="지금은 owner가 요금제를 바꿉니다. OCR을 실제로 열면 신청 시 자동 변경 + 일할계산으로 이어집니다."
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
