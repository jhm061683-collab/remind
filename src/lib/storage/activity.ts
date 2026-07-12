import { readJson, writeJson } from "@/lib/storage/safe-storage";
import type { ActivityEvent, ActivityEventType } from "@/lib/types/activity";
import { createId } from "@/lib/utils/create-id";

const STORAGE_KEY = "wrong-note-activity";

function readAll(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  const parsed = readJson<ActivityEvent[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function writeAll(events: ActivityEvent[]) {
  writeJson(STORAGE_KEY, events);
}

export function getActivityEvents(): ActivityEvent[] {
  return readAll();
}

export function recordActivityEvent(input: {
  type: ActivityEventType;
  questionId?: string;
  wrongReason?: string;
}): ActivityEvent {
  const event: ActivityEvent = {
    id: createId(),
    type: input.type,
    questionId: input.questionId,
    wrongReason: input.wrongReason,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(event);
  writeAll(all);
  return event;
}
