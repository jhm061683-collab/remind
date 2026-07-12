import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbActivity from "@/lib/db/activity";
import * as localActivity from "@/lib/storage/activity";
import type { ActivityEvent, ActivityEventType } from "@/lib/types/activity";

export async function getActivityEvents(userId: string): Promise<ActivityEvent[]> {
  if (isSupabaseEnabled()) {
    return dbActivity.getActivityEvents(userId);
  }
  return Promise.resolve(localActivity.getActivityEvents());
}

export async function recordActivity(
  userId: string,
  input: {
    type: ActivityEventType;
    questionId?: string;
    wrongReason?: string;
  },
): Promise<void> {
  try {
    if (isSupabaseEnabled()) {
      await dbActivity.recordActivityEvent(userId, input);
      return;
    }
    localActivity.recordActivityEvent(input);
  } catch (err) {
    console.error("[recordActivity]", err);
  }
}
