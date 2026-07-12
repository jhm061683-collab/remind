"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  loadPresetsAction,
  findMatchingPresetIdAction,
  resetAllPresetOverridesAction,
  resetPresetOverrideAction,
  savePresetOverrideAction,
  saveReviewSettingsAction,
} from "@/lib/actions/review-settings";
import {
  buildSettingsSummary,
  findMatchingPresetId,
  getPresetsWithOverrides,
  resetAllPresetOverrides,
  resetPresetOverride,
  savePresetOverride,
} from "@/lib/data/custom-presets";
import {
  DEFAULT_REVIEW_SETTINGS,
  REVIEW_SETTINGS_LIMITS,
  REVIEW_SETTINGS_UPDATED,
  getReviewSettings,
  parseSettingNumber,
  sanitizeSettings,
  saveReviewSettings,
} from "@/lib/data/review-settings";
import { useSubjects } from "@/components/student/subject-provider";
import {
  loadReviewUiPrefsAction,
} from "@/lib/actions/user-meta";
import {
  getReviewUiPrefs,
  saveReviewUiPrefs,
  DEFAULT_REVIEW_UI_PREFS,
} from "@/lib/data/user-prefs";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { isLocalStorageAvailable } from "@/lib/storage/safe-storage";
import type { ReviewPreset } from "@/lib/storage/review-presets-defaults";
import { DEFAULT_REVIEW_PRESETS } from "@/lib/storage/review-presets-defaults";
import type { ReviewSettings } from "@/types/subject";

type PresetId = "suneung" | "naeshin" | "gongsi";

type Props = {
  subjectId: string;
  userId: string;
};

function canPersist(userId: string): boolean {
  if (!userId || userId === "guest") return false;
  if (isSupabaseEnabled()) return true;
  return isLocalStorageAvailable();
}

function isPresetModified(
  preset: ReviewPreset | undefined,
  current: ReviewSettings,
): boolean {
  if (!preset) return false;
  return (
    JSON.stringify(sanitizeSettings(current)) !==
    JSON.stringify(sanitizeSettings(preset.settings))
  );
}

function settingsEqual(a: ReviewSettings, b: ReviewSettings): boolean {
  return (
    JSON.stringify(sanitizeSettings(a)) === JSON.stringify(sanitizeSettings(b))
  );
}

export function SubjectSettingsForm({ subjectId, userId }: Props) {
  const { subjects, getSubjectName } = useSubjects();
  const [presets, setPresets] = useState<ReviewPreset[]>([]);
  const [settings, setSettings] = useState<ReviewSettings>(
    DEFAULT_REVIEW_SETTINGS,
  );
  const [savedSettings, setSavedSettings] = useState<ReviewSettings>(
    DEFAULT_REVIEW_SETTINGS,
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("suneung");
  const [applyToAll, setApplyToAll] = useState(false);
  const [savedApplyToAll, setSavedApplyToAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"ok" | "err" | "warn">("ok");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const fetchPresets = useCallback(async (): Promise<ReviewPreset[]> => {
    if (isSupabaseEnabled()) {
      return (await loadPresetsAction()) ?? DEFAULT_REVIEW_PRESETS;
    }
    return getPresetsWithOverrides(userId);
  }, [userId]);

  const loadAll = useCallback(async () => {
    try {
      const loadedPresets = await fetchPresets();
      const loaded = await getReviewSettings(userId, subjectId);
      const prefs = isSupabaseEnabled()
        ? (await loadReviewUiPrefsAction()) ?? DEFAULT_REVIEW_UI_PREFS
        : await getReviewUiPrefs(userId);

      setPresets(loadedPresets);
      setSettings(loaded);
      setSavedSettings(loaded);
      setApplyToAll(prefs.applyToAllSubjects);
      setSavedApplyToAll(prefs.applyToAllSubjects);

      const matched = isSupabaseEnabled()
        ? await findMatchingPresetIdAction(loaded)
        : await findMatchingPresetId(userId, loaded);

      if (matched === "suneung" || matched === "naeshin" || matched === "gongsi") {
        setSelectedPreset(matched);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "설정을 불러오지 못했습니다. 새로고침해 주세요.",
      );
    }
  }, [fetchPresets, subjectId, userId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function showMsg(text: string, type: "ok" | "err" | "warn") {
    setMessage(text);
    setMessageType(type);
  }

  async function pickPreset(presetId: PresetId) {
    const list = await fetchPresets();
    const preset = list.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setSettings({ ...preset.settings });
    showMsg(`「${preset.name}」 선택 — 숫자 수정 후 저장하세요.`, "warn");
  }

  function changeField(key: keyof ReviewSettings, raw: string) {
    const parsed = parseSettingNumber(raw);
    if (parsed === null) return;
    const next = sanitizeSettings({
      ...settings,
      [key]: parsed,
    });
    setSettings(next);
  }

  const subjectIds = subjects.map((s) => s.id);
  const isDirty =
    !settingsEqual(settings, savedSettings) || applyToAll !== savedApplyToAll;

  async function handleSaveReview() {
    if (!canPersist(userId)) {
      showMsg(
        "저장 실패! 로그인 상태를 확인하거나 브라우저 저장을 허용해 주세요.",
        "err",
      );
      return;
    }

    setIsSaving(true);
    setJustSaved(false);
    await new Promise((r) => setTimeout(r, 200));

    const sanitized = sanitizeSettings(settings);
    let ok = false;

    if (isSupabaseEnabled()) {
      const result = await saveReviewSettingsAction(
        subjectId,
        sanitized,
        applyToAll,
        subjectIds,
      );
      if (result.error) {
        setIsSaving(false);
        showMsg(result.error, "err");
        return;
      }
      ok = true;
    } else {
      ok = await saveReviewSettings(
        userId,
        subjectId,
        sanitized,
        applyToAll,
        subjectIds,
      );
      if (ok) {
        const existing = await getReviewUiPrefs(userId);
        await saveReviewUiPrefs(userId, {
          ...existing,
          applyToAllSubjects: applyToAll,
        });
      }
    }

    setIsSaving(false);

    if (!ok) {
      showMsg("저장 실패! 다시 시도해 주세요.", "err");
      return;
    }

    try {
      window.dispatchEvent(
        new CustomEvent(REVIEW_SETTINGS_UPDATED, {
          detail: { subjectId, applyToAllSubjects: applyToAll },
        }),
      );
    } catch {
      // ignore
    }

    const saved = await getReviewSettings(userId, subjectId);
    setSettings(saved);
    setSavedSettings(saved);
    setSavedApplyToAll(applyToAll);
    setJustSaved(true);
    showMsg(
      applyToAll
        ? `✓ 모든 과목에 저장됨: ${buildSettingsSummary(saved)}`
        : `✓ ${getSubjectName(subjectId)}에 저장됨: ${buildSettingsSummary(saved)}`,
      "ok",
    );

    setTimeout(() => setJustSaved(false), 2500);
  }

  async function saveAsPresetDefault() {
    if (!canPersist(userId)) {
      showMsg("저장할 수 없습니다.", "err");
      return;
    }
    const sanitized = sanitizeSettings(settings);
    let ok = false;

    if (isSupabaseEnabled()) {
      const result = await savePresetOverrideAction(selectedPreset, sanitized);
      if (result.error) {
        showMsg(result.error, "err");
        return;
      }
      ok = true;
    } else {
      ok = await savePresetOverride(userId, selectedPreset, sanitized);
    }

    if (!ok) {
      showMsg("프리셋 저장 실패", "err");
      return;
    }

    const reloaded = await fetchPresets();
    setPresets(reloaded);
    setSelectedPreset(selectedPreset);
    setSettings(sanitized);

    const presetName =
      reloaded.find((p) => p.id === selectedPreset)?.name ?? selectedPreset;
    showMsg(`「${presetName}」 프리셋 기본값이 저장되었습니다.`, "ok");
  }

  async function resetCurrentPreset() {
    if (isSupabaseEnabled()) {
      const result = await resetPresetOverrideAction(selectedPreset);
      if (result.error) {
        showMsg(result.error, "err");
        return;
      }
    } else {
      await resetPresetOverride(userId, selectedPreset);
    }

    await pickPreset(selectedPreset);
    setPresets(await fetchPresets());
    showMsg("공장 기본값으로 되돌렸습니다.", "ok");
  }

  const currentPresets = presets;
  const activePreset = currentPresets.find((p) => p.id === selectedPreset);
  const presetModified = isPresetModified(activePreset, settings);

  return (
    <div className="remind-card space-y-5 p-6 md:p-8">
      {loadError ? (
        <div className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900">
          {loadError}
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            messageType === "ok"
              ? "bg-green-100 text-green-900"
              : messageType === "err"
                ? "bg-red-100 text-red-900"
                : "bg-amber-100 text-amber-900"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="rounded-xl bg-blue-600 px-4 py-3 text-white shadow-md">
        <p className="text-xs text-blue-100">현재 선택 / 적용 예정</p>
        <p className="text-lg font-bold">
          {activePreset?.name ?? "복습 설정"}
          {presetModified ? " · 수정 중" : ""}
        </p>
        <p className="mt-1 text-xs">{buildSettingsSummary(settings)}</p>
      </div>

      <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
        <input
          type="checkbox"
          checked={applyToAll}
          onChange={(e) => setApplyToAll(e.target.checked)}
          className="h-5 w-5"
        />
        <span className="text-sm font-medium">
          모든 과목에 똑같이 적용
          {!applyToAll ? (
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">
              체크 안 하면 「{getSubjectName(subjectId)}」만 바뀝니다.
            </span>
          ) : (
            <span className="mt-0.5 block text-xs font-normal text-zinc-500">
              수학·영어·국어 등 내 과목 전부에 같은 주기가 들어갑니다.
            </span>
          )}
        </span>
      </label>

      <div>
        <p className="remind-section-title mb-1">시험 유형</p>
        <p className="mb-3 text-xs text-slate-500">
          탭을 선택한 뒤 숫자를 바꾸고 「프리셋 기본값 저장」을 누르면
          수능·내신·공시·국가시험 기본값이 바뀝니다.
        </p>
        <div className="space-y-2">
          {currentPresets.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => void pickPreset(preset.id as PresetId)}
                className={`remind-preset-tab ${
                  isSelected ? "remind-preset-tab--active" : "remind-preset-tab--idle"
                }`}
              >
                <span className="text-base font-bold">
                  {isSelected ? "✓ " : ""}
                  {preset.name}
                </span>
                <span
                  className={`mt-1 block text-xs ${
                    isSelected ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void saveAsPresetDefault()}
          className="rounded-xl border-2 border-violet-400 bg-violet-50 py-3 text-xs font-bold text-violet-800 touch-manipulation"
        >
          📝 프리셋 기본값 저장
        </button>
        <button
          type="button"
          onClick={() => void resetCurrentPreset()}
          className="rounded-xl border-2 border-zinc-300 py-3 text-xs font-bold text-zinc-600 touch-manipulation"
        >
          ↩ 원래대로
        </button>
      </div>

      <div className="space-y-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900">① 단기</p>
        <NumberField
          label="노출 간격 (일)"
          value={settings.shortIntervalDays}
          min={REVIEW_SETTINGS_LIMITS.shortIntervalDays.min}
          max={REVIEW_SETTINGS_LIMITS.shortIntervalDays.max}
          onChange={(v) => void changeField("shortIntervalDays", v)}
        />
        <NumberField
          label="연속 정답 (회)"
          value={settings.shortStreakRequired}
          min={REVIEW_SETTINGS_LIMITS.shortStreakRequired.min}
          max={REVIEW_SETTINGS_LIMITS.shortStreakRequired.max}
          onChange={(v) => void changeField("shortStreakRequired", v)}
        />
      </div>

      <div className="space-y-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-900">② 중기</p>
        <NumberField
          label="노출 간격 (일)"
          value={settings.mediumIntervalDays}
          min={REVIEW_SETTINGS_LIMITS.mediumIntervalDays.min}
          max={REVIEW_SETTINGS_LIMITS.mediumIntervalDays.max}
          onChange={(v) => void changeField("mediumIntervalDays", v)}
        />
        <NumberField
          label="연속 정답 (회)"
          value={settings.mediumStreakRequired}
          min={REVIEW_SETTINGS_LIMITS.mediumStreakRequired.min}
          max={REVIEW_SETTINGS_LIMITS.mediumStreakRequired.max}
          onChange={(v) => void changeField("mediumStreakRequired", v)}
        />
      </div>

      <div className="space-y-3 rounded-xl border-2 border-green-200 bg-green-50 p-4">
        <p className="text-sm font-bold text-green-900">③ 장기</p>
        <NumberField
          label="노출 간격 (일)"
          value={settings.longIntervalDays}
          min={REVIEW_SETTINGS_LIMITS.longIntervalDays.min}
          max={REVIEW_SETTINGS_LIMITS.longIntervalDays.max}
          onChange={(v) => void changeField("longIntervalDays", v)}
        />
        <NumberField
          label="연속 정답 (회)"
          value={settings.longStreakRequired}
          min={REVIEW_SETTINGS_LIMITS.longStreakRequired.min}
          max={REVIEW_SETTINGS_LIMITS.longStreakRequired.max}
          onChange={(v) => void changeField("longStreakRequired", v)}
        />
      </div>

      <p className="text-xs text-zinc-500">
        숫자는 자동으로 제한됩니다. 단기·중기·장기 노출 {REVIEW_SETTINGS_LIMITS.longIntervalDays.max}일,
        연속 정답 {REVIEW_SETTINGS_LIMITS.shortStreakRequired.max}회 이내로 설정해 주세요.
      </p>

      <button
        type="button"
        onClick={() => void handleSaveReview()}
        disabled={isSaving || !isDirty}
        style={{
          backgroundColor: !isDirty
            ? "#94a3b8"
            : justSaved
              ? "#15803d"
              : isSaving
                ? "#4ade80"
                : "#16a34a",
          transform: isSaving ? "scale(0.97)" : "scale(1)",
        }}
        className="min-h-[56px] w-full rounded-xl py-4 text-base font-bold text-white shadow-md transition-all duration-150 active:scale-95 active:shadow-inner touch-manipulation disabled:opacity-90"
      >
        {isSaving
          ? "⏳ 저장 중..."
          : !isDirty
            ? "변경된 내용 없음"
            : justSaved
              ? "✅ 저장 완료!"
              : "💾 복습 주기 저장"}
      </button>

      <button
        type="button"
        onClick={() => {
          void (async () => {
            if (isSupabaseEnabled()) {
              const result = await resetAllPresetOverridesAction();
              if (result.error) {
                showMsg(result.error, "err");
                return;
              }
              setPresets(await fetchPresets());
            } else {
              await resetAllPresetOverrides(userId);
              setPresets(await fetchPresets());
            }
            showMsg("모든 프리셋을 공장 기본값으로 되돌렸습니다.", "ok");
          })();
        }}
        className="w-full py-2 text-xs text-zinc-400 underline touch-manipulation"
      >
        모든 프리셋 초기화
      </button>

      <p className="text-center text-sm">
        <Link href={`/subjects/${subjectId}`} className="text-blue-600 underline">
          ← 과목으로
        </Link>
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (raw: string) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(String(value));
    }
  }, [value, focused]);

  function commit(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setText(String(value));
      return;
    }
    const parsed = parseInt(digits, 10);
    const clamped = Math.min(max, Math.max(min, parsed));
    onChange(String(clamped));
    setText(String(clamped));
  }

  return (
    <label className="block text-sm">
      {label}
      <span className="ml-1 text-xs font-normal text-zinc-500">
        ({min}~{max})
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onChange={(e) => {
          setText(e.target.value.replace(/\D/g, ""));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(text);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="mt-1 w-full rounded-lg border-2 border-zinc-300 bg-white px-3 py-3 text-lg font-bold"
      />
    </label>
  );
}
