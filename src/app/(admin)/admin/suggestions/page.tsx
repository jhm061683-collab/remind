import { AdminSuggestionsList } from "@/components/admin/suggestions-list";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { canViewSuggestions } from "@/lib/constants/suggestions";
import { redirect } from "next/navigation";

export default async function AdminSuggestionsPage() {
  const session = await getSession();
  if (!session || !canViewSuggestions(session.role)) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="건의사항"
        description="학생들이 보낸 건의예요. 나중에는 원장을 관리하는 메인 계정에서만 보이게 옮길 예정이에요."
      />
      <AdminSuggestionsList />
    </div>
  );
}
