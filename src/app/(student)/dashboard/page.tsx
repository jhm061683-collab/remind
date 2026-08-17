import { HomeOverview } from "@/components/student/home-overview";
import { getSession } from "@/lib/auth/session";
import {
  getAcademyHallOfFame,
  getStudentHomeRankingBundle,
  type AcademyHallOfFame,
  type AcademyMonthlyBoard,
  type StudentRankCard,
} from "@/lib/server/rankings";
import { createServiceClient } from "@/lib/supabase/service";
import { isSupabaseUserId } from "@/lib/supabase/config";

export default async function StudentDashboardPage() {
  const session = await getSession();
  const userId = session?.id ?? "guest";
  const name = session?.name ?? "학생";

  let rank: StudentRankCard | null = null;
  let monthlyBoard: AcademyMonthlyBoard | null = null;
  let hallOfFame: AcademyHallOfFame | null = null;
  let avatarUrl: string | null = null;

  if (session && isSupabaseUserId(session.id)) {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("academy_id, avatar_url, school_level")
      .eq("id", session.id)
      .maybeSingle();

    avatarUrl = (profile?.avatar_url as string | null) ?? null;
    const academyId = (profile?.academy_id as string | null) ?? null;
    const schoolLevel = (profile?.school_level as string | null) ?? null;
    if (academyId) {
      const [bundle, hof] = await Promise.all([
        getStudentHomeRankingBundle(academyId, session.id, schoolLevel),
        getAcademyHallOfFame(academyId, schoolLevel),
      ]);
      rank = bundle.rank;
      monthlyBoard = bundle.monthlyBoard;
      hallOfFame = hof;
    }
  }

  return (
    <HomeOverview
      userId={userId}
      userName={name}
      rank={rank}
      monthlyBoard={monthlyBoard}
      hallOfFame={hallOfFame}
      avatarUrl={avatarUrl}
    />
  );
}
