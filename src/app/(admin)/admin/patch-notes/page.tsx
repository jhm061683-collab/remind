import { PatchNotesContent } from "@/components/content/patch-notes-content";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import type { PatchViewerRole } from "@/lib/content/patch-notes";
import { requireStaff } from "@/lib/server/admin/auth";

export default async function AdminPatchNotesPage() {
  await requireStaff();
  const session = await getSession();
  const role: PatchViewerRole =
    session?.role === "admin" ? "admin" : "sub_admin";

  return (
    <>
      <PageHeader
        title="패치노트"
        description={
          role === "admin"
            ? "학생·선생님·원장 관련 업데이트를 모두 보여 드려요."
            : "학생·선생님 관련 업데이트를 보여 드려요."
        }
      />
      <div className="mx-auto max-w-3xl">
        <PatchNotesContent role={role} />
      </div>
    </>
  );
}
