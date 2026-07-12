"use server";

import { getSession } from "@/lib/auth/session";
import {
  getReviewUiPrefsOnServer,
  getUserSubjectsOnServer,
  saveReviewUiPrefsOnServer,
  saveUserSubjectsOnServer,
} from "@/lib/server/user-meta";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";
import type { ReviewUiPrefs } from "@/lib/storage/user-prefs";
import type { UserSubject } from "@/lib/storage/user-subjects";

export type MetaActionState = { error?: string };

function authError(): MetaActionState {
  return { error: "로그인이 필요합니다." };
}

export async function saveUserSubjectsAction(
  subjects: UserSubject[],
): Promise<MetaActionState> {
  if (!isSupabaseEnabled()) return { error: "Supabase 미사용" };
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return authError();
  try {
    await saveUserSubjectsOnServer(session.id, subjects);
    return {};
  } catch (err) {
    console.error("[saveUserSubjectsAction]", err);
    return { error: "과목 저장 실패" };
  }
}

export async function saveReviewUiPrefsAction(
  prefs: ReviewUiPrefs,
): Promise<MetaActionState> {
  if (!isSupabaseEnabled()) return { error: "Supabase 미사용" };
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return authError();
  try {
    await saveReviewUiPrefsOnServer(session.id, prefs);
    return {};
  } catch (err) {
    console.error("[saveReviewUiPrefsAction]", err);
    return { error: "설정 저장 실패" };
  }
}

export async function loadUserSubjectsAction() {
  if (!isSupabaseEnabled()) return null;
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return null;
  return getUserSubjectsOnServer(session.id);
}

export async function loadReviewUiPrefsAction() {
  if (!isSupabaseEnabled()) return null;
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return null;
  return getReviewUiPrefsOnServer(session.id);
}
