import { BackBar } from "@/components/ui/back-bar";
import { SubjectPageHeader } from "@/components/student/subject-page-header";
import { SubjectSettingsForm } from "@/components/student/subject-settings-form";
import { getSession } from "@/lib/auth/session";

type Props = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectSettingsPage({ params }: Props) {
  const { subjectId } = await params;
  const session = await getSession();

  return (
    <>
      <BackBar href="/subjects" label="과목 설정" />
      <SubjectPageHeader
        subjectId={subjectId}
        suffix="복습 주기"
        description="단기 → 중기 → 장기, 다시 풀 날짜를 정해요."
      />
      <SubjectSettingsForm
        subjectId={subjectId}
        userId={session?.id ?? "guest"}
      />
    </>
  );
}
