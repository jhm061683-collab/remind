import { createClient } from "@/lib/supabase/server";
import type { ActivityEventType } from "@/lib/types/activity";

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    Boolean(error.message?.includes("activity_events"))
  );
}

export async function recordActivityOnServer(
  userId: string,
  input: {
    type: ActivityEventType;
    questionId?: string;
    wrongReason?: string;
  },
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_events").insert({
    user_id: userId,
    event_type: input.type,
    question_id: input.questionId ?? null,
    wrong_reason: input.wrongReason ?? null,
  });

  if (error && !isMissingTableError(error)) {
    console.error("[recordActivityOnServer]", error);
  }
}
