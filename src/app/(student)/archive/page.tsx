import { Suspense } from "react";
import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { ArchiveList } from "@/components/student/archive-list";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { getSession } from "@/lib/auth/session";

export default async function ArchivePage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title={UI_LABELS.archivePageTitle}
        description={UI_LABELS.archivePageDesc}
        compact
      />
      <Suspense fallback={<p className="text-sm text-[var(--rm-text-muted)]">불러오는 중...</p>}>
        <ArchiveList userId={userId} />
      </Suspense>
    </div>
  );
}
