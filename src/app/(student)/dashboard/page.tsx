import { HomeOverview } from "@/components/student/home-overview";
import { MobileAccessGuide } from "@/components/student/mobile-access-guide";
import { getSession } from "@/lib/auth/session";

export default async function StudentDashboardPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";
  const name = session?.name ?? "학생";

  return (
    <>
      <HomeOverview userId={userId} userName={name} />

      <details className="mt-8 group">
        <summary className="cursor-pointer list-none text-center text-xs text-slate-400 marker:content-none">
          <span className="group-open:hidden">📱 폰에서 테스트하기</span>
          <span className="hidden group-open:inline">접기</span>
        </summary>
        <div className="mt-2">
          <MobileAccessGuide />
        </div>
      </details>
    </>
  );
}
