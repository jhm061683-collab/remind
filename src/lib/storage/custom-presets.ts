import type { ReviewSettings } from "@/types/subject";
import {
  buildSettingsSummary,
  DEFAULT_REVIEW_PRESETS,
  type ReviewPreset,
} from "@/lib/storage/review-presets-defaults";
import {
  DEFAULT_REVIEW_SETTINGS,
  sanitizeSettings,
} from "@/lib/storage/review-settings";
import { readJson, removeItem, writeJson } from "@/lib/storage/safe-storage";

const STORAGE_KEY = "wrong-note-custom-presets";

export type CustomPresetStore = Record<
  string,
  { settings?: ReviewSettings; name?: string }
>;

function readStore(): CustomPresetStore {
  return readJson<CustomPresetStore>(STORAGE_KEY, {});
}

function writeStore(store: CustomPresetStore): boolean {
  return writeJson(STORAGE_KEY, store).ok;
}

function normalizeSettings(raw: ReviewSettings | undefined): ReviewSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_REVIEW_SETTINGS;
  }
  return sanitizeSettings({ ...DEFAULT_REVIEW_SETTINGS, ...raw });
}

export function getPresetsWithOverrides(): ReviewPreset[] {
  const store = readStore();
  return DEFAULT_REVIEW_PRESETS.map((preset) => {
    const custom = store[preset.id];
    if (!custom?.settings) return preset;
    const settings = normalizeSettings(custom.settings);
    return {
      ...preset,
      name: custom.name ?? preset.name,
      settings,
      description: buildSettingsSummary(settings),
    };
  });
}

export function savePresetOverride(
  presetId: string,
  settings: ReviewSettings,
  name?: string,
): boolean {
  const store = readStore();
  store[presetId] = { settings: sanitizeSettings(settings), name };
  return writeStore(store);
}

export function resetPresetOverride(presetId: string): boolean {
  const store = readStore();
  delete store[presetId];
  return writeStore(store);
}

export function resetAllPresetOverrides(): boolean {
  return removeItem(STORAGE_KEY);
}

export function findMatchingPresetId(settings: ReviewSettings): string | null {
  const normalized = sanitizeSettings(settings);
  const presets = getPresetsWithOverrides();
  const match = presets.find(
    (preset) =>
      JSON.stringify(preset.settings) === JSON.stringify(normalized),
  );
  return match?.id ?? null;
}

export { buildSettingsSummary } from "@/lib/storage/review-presets-defaults";
