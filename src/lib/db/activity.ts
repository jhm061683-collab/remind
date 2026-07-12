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
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("user_id", userId)
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
