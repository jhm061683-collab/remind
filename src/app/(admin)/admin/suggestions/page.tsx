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
        description="학생이 보낸 건의 목록"
      />
      <AdminSuggestionsList />
    </div>
  );
}
