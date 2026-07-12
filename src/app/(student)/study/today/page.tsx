import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { TodayStudySession } from "@/components/student/today-study-session";
import { UI_LABELS } from "@/lib/constants/ui-labels";
import { getSession } from "@/lib/auth/session";

export default async function TodayStudyPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";

  return (
    <>
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title={UI_LABELS.studyPageTitle}
        description={UI_LABELS.studyPageDesc}
        compact
      />
      <TodayStudySession userId={userId} />
    </>
  );
}
