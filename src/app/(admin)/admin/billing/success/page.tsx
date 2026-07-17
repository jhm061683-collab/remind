import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";
import {
  getAcademyIdForAdmin,
  issueBillingKeyFromAuth,
} from "@/lib/server/billing/queries";
import { revalidatePath } from "next/cache";

type Props = {
  searchParams: Promise<{ customerKey?: string; authKey?: string }>;
};

export default async function BillingSuccessPage({ searchParams }: Props) {
  const session = await requireAdmin();
  const { customerKey, authKey } = await searchParams;

  let error: string | undefined;
  let ok: string | undefined;

  if (!customerKey || !authKey) {
    error = "결제 인증 정보가 없습니다. 다시 카드 등록을 시도해 주세요.";
  } else {
    const academyId = await getAcademyIdForAdmin(session.id);
    if (!academyId) {
      error = "학원 정보가 없습니다.";
    } else {
      const result = await issueBillingKeyFromAuth({
        academyId,
        authKey,
        customerKey,
      });
      if (result.error) {
        error = result.error;
      } else {
        ok = "카드가 등록되었습니다.";
        revalidatePath("/admin/billing");
        revalidatePath("/platform");
      }
    }
  }

  return (
    <>
      <PageHeader title="카드 등록 결과" />
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <p className="text-sm text-emerald-800">
            {ok ?? "카드가 등록되었습니다."}
          </p>
        )}
        <Link
          href="/admin/billing"
          className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          결제 화면으로
        </Link>
      </div>
    </>
  );
}
