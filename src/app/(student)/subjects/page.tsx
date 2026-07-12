import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SubjectList } from "@/components/student/subject-list";
import { getSession } from "@/lib/auth/session";

export default async function SubjectsPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";

  return (
    <>
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="과목 설정"
        description="교과 이름을 바꾸고, 과목마다 복습 주기를 정해요."
      />
      <SubjectList userId={userId} />
    </>
  );
}
