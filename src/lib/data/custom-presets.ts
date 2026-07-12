import { isSupabaseEnabled } from "@/lib/supabase/config";
import * as dbPresets from "@/lib/db/custom-presets";
import * as localPresets from "@/lib/storage/custom-presets";
import type { ReviewSettings } from "@/types/subject";

export { buildSettingsSummary } from "@/lib/storage/review-presets-defaults";
export type { ReviewPreset } from "@/lib/storage/review-presets-defaults";

export async function getPresetsWithOverrides(userId: string) {
  if (isSupabaseEnabled()) {
    return dbPresets.getPresetsWithOverrides(userId);
  }
  return Promise.resolve(localPresets.getPresetsWithOverrides());
}

export async function savePresetOverride(
  userId: string,
  presetId: string,
  settings: ReviewSettings,
  name?: string,
) {
  if (isSupabaseEnabled()) {
    return dbPresets.savePresetOverride(userId, presetId, settings, name);
  }
  return Promise.resolve(
    localPresets.savePresetOverride(presetId, settings, name),
  );
}

export async function resetPresetOverride(userId: string, presetId: string) {
  if (isSupabaseEnabled()) {
    return dbPresets.resetPresetOverride(userId, presetId);
  }
  return Promise.resolve(localPresets.resetPresetOverride(presetId));
}

export async function resetAllPresetOverrides(userId: string) {
  if (isSupabaseEnabled()) {
    return dbPresets.resetAllPresetOverrides(userId);
  }
  return Promise.resolve(localPresets.resetAllPresetOverrides());
}

export async function findMatchingPresetId(
  userId: string,
  settings: ReviewSettings,
) {
  if (isSupabaseEnabled()) {
    return dbPresets.findMatchingPresetId(userId, settings);
  }
  return Promise.resolve(localPresets.findMatchingPresetId(settings));
}
