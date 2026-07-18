import { PatchNotesContent } from "@/components/content/patch-notes-content";
import { PageHeader } from "@/components/ui/page-header";

export default function AdminPatchNotesPage() {
  return (
    <>
      <PageHeader
        title="패치노트"
        description="Re:mind에 새로 추가되거나 달라진 내용을 알려 드려요."
      />
      <div className="mx-auto max-w-3xl">
        <PatchNotesContent />
      </div>
    </>
  );
}
