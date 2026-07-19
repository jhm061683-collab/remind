import { BackBar } from "@/components/ui/back-bar";
import { PageHeader } from "@/components/ui/page-header";
import { QuestionUploadForm } from "@/components/student/question-upload-form";
import { getSession } from "@/lib/auth/session";
import { getStudentAiQuotaStatus } from "@/lib/server/ai/engine-quota";

type Props = {
  searchParams: Promise<{ subject?: string }>;
};

export default async function UploadPage({ searchParams }: Props) {
  const { subject } = await searchParams;
  const session = await getSession();
  const aiQuota =
    session?.role === "student"
      ? await getStudentAiQuotaStatus(session.id)
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <BackBar href="/dashboard" label="홈" />
      <PageHeader
        title="문제 등록"
        description="사진 찍고, 정답만 적으면 끝이에요."
        compact
      />
      <QuestionUploadForm
        userId={session?.id ?? "guest"}
        defaultSubjectId={subject}
        initialAiQuota={aiQuota}
      />
    </div>
  );
}
