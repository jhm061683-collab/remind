import { QuestionUploadForm } from "@/components/student/question-upload-form";
import { getStudentAiQuotaStatus } from "@/lib/server/ai/engine-quota";

type Props = {
  userId: string;
  role?: string;
  defaultSubjectId?: string;
};

export async function UploadFormSection({
  userId,
  role,
  defaultSubjectId,
}: Props) {
  const aiQuota =
    role === "student" ? await getStudentAiQuotaStatus(userId) : null;

  return (
    <QuestionUploadForm
      userId={userId}
      defaultSubjectId={defaultSubjectId}
      initialAiQuota={aiQuota}
    />
  );
}
