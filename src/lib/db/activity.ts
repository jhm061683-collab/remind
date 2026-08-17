import { createClient } from "@/lib/supabase/client";
import type { ActivityEvent, ActivityEventType } from "@/lib/types/activity";

type ActivityRow = {
  id: string;
  user_id: string;
  event_type: ActivityEventType;
  question_id: string | null;
  wrong_reason: string | null;
  created_at: string;
};

function rowToEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    type: row.event_type,
    questionId: row.question_id ?? undefined,
    wrongReason: row.wrong_reason ?? undefined,
    createdAt: row.created_at,
  };
}

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("activity_events"))
  );
}

export async function getActivityEvents(userId: string): Promise<ActivityEvent[]> {
  const supabase = createClient();
  // 홈/통계용 — 평생 이력이 아니라 최근 180일만 (연속출석·주간 리포트에 충분)
  const since = new Date(
    Date.now() - 180 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, user_id, event_type, question_id, wrong_reason, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data as ActivityRow[]).map(rowToEvent);
}

export async function recordActivityEvent(
  userId: string,
  input: {
    type: ActivityEventType;
    questionId?: string;
    wrongReason?: string;
  },
): Promise<ActivityEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      user_id: userId,
      event_type: input.type,
      question_id: input.questionId ?? null,
      wrong_reason: input.wrongReason ?? null,
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return rowToEvent(data as ActivityRow);
}
