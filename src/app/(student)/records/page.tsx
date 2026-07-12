import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { RecordsOverview } from "@/components/student/records-overview";
import { getSession } from "@/lib/auth/session";

export default async function RecordsPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";

  return (
    <>
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="내 기록"
        description="학습 통계, 업적, 주간 리포트를 확인해요."
      />
      <RecordsOverview userId={userId} />
    </>
  );
}
