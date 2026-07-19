import { Suspense } from "react";
import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { ArchiveList } from "@/components/student/archive-list";
import { getSession } from "@/lib/auth/session";

export default async function ArchivePage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="보관함"
        description="저장한 문제를 찾아보세요."
        compact
      />
      <Suspense fallback={<p className="text-sm text-[var(--rm-text-muted)]">불러오는 중...</p>}>
        <ArchiveList userId={userId} />
      </Suspense>
    </div>
  );
}
