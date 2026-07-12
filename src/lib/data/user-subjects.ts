import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbMeta from "@/lib/db/user-meta";
import {
  createSubjectId,
  DEFAULT_SUBJECTS,
  getUserSubjectsLocal,
  saveUserSubjectsLocal,
  type UserSubject,
} from "@/lib/storage/user-subjects";

export type { UserSubject };
export { DEFAULT_SUBJECTS, createSubjectId };

export async function getUserSubjects(userId: string): Promise<UserSubject[]> {
  if (isSupabaseEnabled()) {
    return dbMeta.getUserSubjectsDb(userId);
  }
  return Promise.resolve(getUserSubjectsLocal());
}

export async function saveUserSubjects(
  userId: string,
  subjects: UserSubject[],
): Promise<boolean> {
  if (isSupabaseEnabled()) {
    return dbMeta.saveUserSubjectsDb(userId, subjects);
  }
  return Promise.resolve(saveUserSubjectsLocal(subjects));
}

export function getSubjectNameFromList(
  subjects: UserSubject[],
  subjectId: string,
): string {
  return subjects.find((s) => s.id === subjectId)?.name ?? subjectId;
}

export const SUBJECTS_UPDATED = "subjects-updated";
