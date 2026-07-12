import { SuggestionForm } from "@/components/student/suggestion-form";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SuggestionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-4 px-1 pb-8">
      <PageHeader
        title="건의사항"
        description="앱 사용 중 불편한 점이나 바라는 점을 남겨 주세요."
      />
      <SuggestionForm userId={session.id} userName={session.name} />
    </div>
  );
}
