import { BillingPanel } from "@/components/admin/billing-panel";
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
  const summary = await getAcademyBillingSummary(academyId);
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
        description={
          mockMode
            ? "지금은 목 결제입니다. 학생 수 × 단가 계산·등록 흐름만 시험합니다."
            : "학생 수에 따라 월 요금이 달라집니다. 카드는 토스페이먼츠에만 등록됩니다."
        }
      />
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
