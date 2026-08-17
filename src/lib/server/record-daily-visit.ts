import { createServiceClient } from "@/lib/supabase/service";
import {
  endOfKstDayIso,
  startOfTodayKstIso,
  toDateKey,
} from "@/lib/utils/date-range";

/**
 * KST 기준 오늘 첫 방문/로그인 1회만 login_events에 기록한다.
 * 세션 유지 상태로 앱만 열어도 출석일수에 반영된다.
 */
export async function recordDailyVisitOnServer(userId: string): Promise<boolean> {
  if (!userId) return false;

  const supabase = createServiceClient();
  const todayKey = toDateKey(new Date());
  const startIso = startOfTodayKstIso();
  const endIso = endOfKstDayIso(todayKey);

  const { data: existing, error: selectError } = await supabase
    .from("login_events")
    .select("id")
    .eq("user_id", userId)
    .gte("logged_in_at", startIso)
    .lte("logged_in_at", endIso)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.warn("[recordDailyVisit]", selectError.message);
    return false;
  }
  if (existing) return false;

  const { error: insertError } = await supabase
    .from("login_events")
    .insert({ user_id: userId });

  if (insertError) {
    console.warn("[recordDailyVisit]", insertError.message);
    return false;
  }
  return true;
}
