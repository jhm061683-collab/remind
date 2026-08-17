import { StudentHelpContent } from "@/components/content/student-help-content";
import { ReplayTutorials } from "@/components/tutorial/replay-tutorials";
import { PageHeader } from "@/components/ui/page-header";

export default function StudentHelpPage() {
  return (
    <>
      <PageHeader
        title="사용법"
        description="등록 → 다시 풀기 → 보관함 순서로 쓰는 방법을 확인하세요."
      />
      <div className="mb-4">
        <ReplayTutorials />
      </div>
      <StudentHelpContent />
    </>
  );
}
