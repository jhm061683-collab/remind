import { createClient } from "@/lib/supabase/server";
import {
  buildSettingsSummary,
  DEFAULT_REVIEW_PRESETS,
  type ReviewPreset,
} from "@/lib/storage/review-presets-defaults";
import {
  DEFAULT_REVIEW_SETTINGS,
  sanitizeSettings,
} from "@/lib/storage/review-settings";
import type { ReviewSettings } from "@/types/subject";

export async function getPresetsWithOverridesOnServer(
  userId: string,
): Promise<ReviewPreset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_preset_overrides")
    .select("preset_id, settings, name")
    .eq("user_id", userId);

  if (error) throw error;

  const store = new Map(
    (data ?? []).map((row) => [
      row.preset_id,
      {
        settings: row.settings as ReviewSettings,
        name: row.name as string | undefined,
      },
    ]),
  );

  return DEFAULT_REVIEW_PRESETS.map((preset) => {
    const custom = store.get(preset.id);
    if (!custom?.settings) return preset;
    const settings = sanitizeSettings({
      ...DEFAULT_REVIEW_SETTINGS,
      ...custom.settings,
    });
    return {
      ...preset,
      name: custom.name ?? preset.name,
      settings,
      description: buildSettingsSummary(settings),
    };
  });
}

export async function savePresetOverrideOnServer(
  userId: string,
  presetId: string,
  settings: ReviewSettings,
  name?: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("custom_preset_overrides").upsert(
    {
      user_id: userId,
      preset_id: presetId,
      settings: sanitizeSettings(settings),
      name: name ?? null,
    },
    { onConflict: "user_id,preset_id" },
  );
  if (error) throw error;
}

export async function resetPresetOverrideOnServer(
  userId: string,
  presetId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_preset_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("preset_id", presetId);
  if (error) throw error;
}

export async function resetAllPresetOverridesOnServer(
  userId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_preset_overrides")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export async function findMatchingPresetIdOnServer(
  userId: string,
  settings: ReviewSettings,
): Promise<string | null> {
  const presets = await getPresetsWithOverridesOnServer(userId);
  const normalized = sanitizeSettings(settings);
  const match = presets.find(
    (preset) =>
      JSON.stringify(preset.settings) === JSON.stringify(normalized),
  );
  return match?.id ?? null;
}
