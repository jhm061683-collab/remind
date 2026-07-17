"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/admin/auth";
import {
  chargeAcademySubscription,
  getAcademyIdForAdmin,
  issueBillingKeyFromAuth,
  registerMockBillingCard,
} from "@/lib/server/billing/queries";

export type BillingActionState = {
  error?: string;
  ok?: string;
};

export async function completeBillingAuthAction(input: {
  authKey: string;
  customerKey: string;
}): Promise<BillingActionState> {
  const session = await requireAdmin();
  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const result = await issueBillingKeyFromAuth({
    academyId,
    authKey: input.authKey,
    customerKey: input.customerKey,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/admin/billing");
  revalidatePath("/platform");
  return { ok: "카드가 등록되었습니다." };
}

export async function registerMockCardAction(): Promise<BillingActionState> {
  const session = await requireAdmin();
  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const result = await registerMockBillingCard(academyId);
  if (result.error) return { error: result.error };

  revalidatePath("/admin/billing");
  revalidatePath("/platform");
  return {
    ok: "목 카드가 등록되었습니다. (실제 결제는 아님 · 사업자번호 전 테스트용)",
  };
}

export async function chargeThisMonthAction(): Promise<BillingActionState> {
  const session = await requireAdmin();
  const academyId = await getAcademyIdForAdmin(session.id);
  if (!academyId) return { error: "학원 정보가 없습니다." };

  const result = await chargeAcademySubscription({ academyId });
  if (result.error) return { error: result.error };

  revalidatePath("/admin/billing");
  revalidatePath("/platform");
  return {
    ok: `이번 달 ${result.amountKrw?.toLocaleString("ko-KR")}원 결제가 완료되었습니다.`,
  };
}
