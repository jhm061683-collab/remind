import { StudentHelpContent } from "@/components/content/student-help-content";
import { PageHeader } from "@/components/ui/page-header";

export default function StudentHelpPage() {
  return (
    <>
      <PageHeader
        title="사용법"
        description="등록부터 복습과 보관까지, Re:mind 사용 순서를 확인하세요."
      />
      <StudentHelpContent />
    </>
  );
}
