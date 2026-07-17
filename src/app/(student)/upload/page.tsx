import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionUploadForm } from "@/components/student/question-upload-form";
import { getSession } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ subject?: string }>;
};

export default async function UploadPage({ searchParams }: Props) {
  const { subject } = await searchParams;
  const session = await getSession();

  return (
    <>
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="문제 등록"
        description="사진 찍고, 정답만 적으면 끝이에요."
        compact
      />
      <QuestionUploadForm
        userId={session?.id ?? "guest"}
        defaultSubjectId={subject}
      />
    </>
  );
}
