import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireAdmin } from "@/lib/server/admin/auth";

type Props = {
  searchParams: Promise<{ code?: string; message?: string }>;
};

export default async function BillingFailPage({ searchParams }: Props) {
  await requireAdmin();
  const { code, message } = await searchParams;

  return (
    <>
      <PageHeader title="카드 등록 실패" />
      <div className="rounded-2xl border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4 md:p-5">
        <p className="text-sm text-red-700">
          {message || "카드 등록이 취소되었거나 실패했습니다."}
        </p>
        {code ? (
          <p className="mt-2 text-xs text-[var(--rm-text-muted)]">코드: {code}</p>
        ) : null}
        <Link
          href="/admin/billing"
          className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
        >
          다시 시도
        </Link>
      </div>
    </>
  );
}
