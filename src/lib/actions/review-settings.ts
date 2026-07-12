"use server";

import { getSession } from "@/lib/auth/session";
import {
  findMatchingPresetIdOnServer,
  getPresetsWithOverridesOnServer,
  resetAllPresetOverridesOnServer,
  resetPresetOverrideOnServer,
  savePresetOverrideOnServer,
} from "@/lib/server/custom-presets";
import { saveReviewSettingsOnServer } from "@/lib/server/review-settings";
import {
  getReviewUiPrefsOnServer,
  saveReviewUiPrefsOnServer,
} from "@/lib/server/user-meta";
import {
  isSupabaseEnabled,
  isSupabaseUserId,
} from "@/lib/supabase/config";
import type { ReviewSettings } from "@/types/subject";

export type SettingsActionState = {
  error?: string;
};

function authError(): SettingsActionState {
  return { error: "로그인이 필요합니다. 다시 로그인해 주세요." };
}

export async function saveReviewSettingsAction(
  subjectId: string,
  settings: ReviewSettings,
  applyToAllSubjects: boolean,
  allSubjectIds: string[],
): Promise<SettingsActionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return authError();
  }

  try {
    await saveReviewSettingsOnServer(
      session.id,
      subjectId,
      settings,
      applyToAllSubjects,
      allSubjectIds,
    );
    const prefs = await getReviewUiPrefsOnServer(session.id);
    await saveReviewUiPrefsOnServer(session.id, {
      ...prefs,
      applyToAllSubjects,
    });
    return {};
  } catch (err) {
    console.error("[saveReviewSettingsAction]", err);
    return { error: "저장 실패! 다시 시도해 주세요." };
  }
}

export async function savePresetOverrideAction(
  presetId: string,
  settings: ReviewSettings,
): Promise<SettingsActionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return authError();
  }

  try {
    await savePresetOverrideOnServer(session.id, presetId, settings);
    return {};
  } catch (err) {
    console.error("[savePresetOverrideAction]", err);
    return { error: "프리셋 저장 실패" };
  }
}

export async function resetPresetOverrideAction(
  presetId: string,
): Promise<SettingsActionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return authError();
  }

  try {
    await resetPresetOverrideOnServer(session.id, presetId);
    return {};
  } catch (err) {
    console.error("[resetPresetOverrideAction]", err);
    return { error: "프리셋 초기화 실패" };
  }
}

export async function resetAllPresetOverridesAction(): Promise<SettingsActionState> {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase가 설정되지 않았습니다." };
  }

  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) {
    return authError();
  }

  try {
    await resetAllPresetOverridesOnServer(session.id);
    return {};
  } catch (err) {
    console.error("[resetAllPresetOverridesAction]", err);
    return { error: "프리셋 초기화 실패" };
  }
}

export async function loadPresetsAction() {
  if (!isSupabaseEnabled()) return null;
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return null;
  return getPresetsWithOverridesOnServer(session.id);
}

export async function findMatchingPresetIdAction(settings: ReviewSettings) {
  if (!isSupabaseEnabled()) return null;
  const session = await getSession();
  if (!session || !isSupabaseUserId(session.id)) return null;
  return findMatchingPresetIdOnServer(session.id, settings);
}
