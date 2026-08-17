"use client";

import { motion } from "framer-motion";
import { useState, useTransition } from "react";
import { StudentAvatarBadge } from "@/components/student/dashboard/student-avatar-badge";
import {
  ACC_SRC,
  GLASSES_SRC,
  HAT_SRC,
  PhotoClayAvatar,
} from "@/components/student/dashboard/photo-clay-avatar";
import { setStudentAvatarConfigAction } from "@/lib/actions/avatars";
import {
  AVATAR_ACCESSORIES,
  AVATAR_BACKGROUNDS,
  AVATAR_GLASSES,
  AVATAR_HATS,
  AVATAR_PRESETS,
  defaultVariantId,
  formatAnimalVariantLabel,
  getAvatarPresetById,
  parseAvatarConfig,
  resolveAvatarBackgroundCss,
  type AvatarAccessoryId,
  type AvatarBgId,
  type AvatarConfig,
  type AvatarGlassesId,
  type AvatarHatId,
  type AvatarPresetId,
} from "@/lib/avatars/presets";

type Props = {
  initialValue?: string | null;
  seed?: string;
  onSaved?: (value: string) => void;
  gridOnly?: boolean;
};

type Category = "animal" | "hat" | "glasses" | "accessory" | "bg";

const TAB_ICONS: Record<Category, string> = {
  animal: "🐾",
  hat: "🧢",
  glasses: "👓",
  accessory: "🎀",
  bg: "🎨",
};

const TAB_LABELS: Record<Category, string> = {
  animal: "동물",
  hat: "모자",
  glasses: "안경",
  accessory: "악세사리",
  bg: "배경",
};

export function StudentAvatarPicker({
  initialValue = null,
  seed = "student",
  onSaved,
  gridOnly = false,
}: Props) {
  const [draft, setDraft] = useState<AvatarConfig>(() =>
    parseAvatarConfig(initialValue, seed),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<Category>("animal");

  function patch(partial: Partial<AvatarConfig>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function save() {
    startTransition(async () => {
      const result = await setStudentAvatarConfigAction(draft);
      if (result.error || !result.value) {
        setMessage(result.error ?? "저장 실패");
        return;
      }
      setMessage("캐릭터를 저장했어요!");
      onSaved?.(result.value);
    });
  }

  const previewBg = resolveAvatarBackgroundCss(draft);

  return (
    <div
      className={
        gridOnly
          ? "space-y-4"
          : "rm-glass rm-glass--compact space-y-4"
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Preview card — key 없음: 탭/파츠 전환 시 리마운트·지터 방지, draft state 유지 */}
        <div
          className="relative flex min-h-[16rem] flex-col items-center justify-center overflow-hidden rounded-3xl p-5 shadow-2xl ring-1 ring-white/50"
          style={{
            background: previewBg,
            boxShadow:
              "0 28px 60px -20px rgba(37,99,235,0.35), 0 0 48px -12px rgba(168,85,247,0.28)",
          }}
        >
          <span className="absolute right-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold tracking-wide text-[var(--rm-text-muted)] shadow-sm backdrop-blur">
            Preview
          </span>
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.55),transparent_55%)]" />
          <motion.div
            className="relative z-[1]"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <PhotoClayAvatar
              animal={draft.animal}
              variant={draft.variant}
              hat={draft.hat}
              glasses={draft.glasses}
              accessory={draft.accessory}
              size={168}
              className="rounded-[1.75rem] shadow-xl ring-1 ring-black/5"
            />
          </motion.div>
          <p className="relative z-[1] mt-3 text-center text-sm font-extrabold text-[var(--rm-text)]">
            {formatAnimalVariantLabel(draft.animal, draft.variant)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="text-sm font-extrabold text-[var(--rm-text)]">
              Re:mind 프로필 캐릭터
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--rm-text-muted)]">
              3D 클레이 동물 위에 모자·안경·악세사리를 얹어 꾸며 보세요.
            </p>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(Object.keys(TAB_LABELS) as Category[]).map((id) => {
              const active = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={`flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2.5 py-2 transition ${
                    active
                      ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_12%,white)] shadow-sm"
                      : "border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]"
                  }`}
                >
                  <span className="text-base leading-none">{TAB_ICONS[id]}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      active
                        ? "text-[var(--rm-brand)]"
                        : "text-[var(--rm-text-muted)]"
                    }`}
                  >
                    {TAB_LABELS[id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[var(--rm-border)] bg-white/70 p-2.5 shadow-sm backdrop-blur">
            <p className="mb-2 px-0.5 text-[11px] font-bold text-[var(--rm-text-muted)]">
              {TAB_LABELS[category]}
            </p>

            {category === "animal" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-1.5">
                  {AVATAR_PRESETS.map((item) => (
                    <AnimalChip
                      key={item.id}
                      active={draft.animal === item.id}
                      animal={item.id}
                      variant={
                        draft.animal === item.id
                          ? draft.variant
                          : item.variants[0]!.id
                      }
                      label={item.label}
                      onClick={() =>
                        patch({
                          animal: item.id,
                          variant: defaultVariantId(item.id),
                        })
                      }
                    />
                  ))}
                </div>
                <div>
                  <p className="mb-1.5 px-0.5 text-[10px] font-bold text-[var(--rm-text-muted)]">
                    품종
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {getAvatarPresetById(draft.animal).variants.map((v) => (
                      <ChipButton
                        key={v.id}
                        active={draft.variant === v.id}
                        label={v.label}
                        thumbSrc={`/avatars/animals/${draft.animal}-${v.id}.png`}
                        onClick={() => patch({ variant: v.id })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {category === "hat" ? (
              <ChipGrid>
                {AVATAR_HATS.map((item) => (
                  <ChipButton
                    key={item.id}
                    active={draft.hat === item.id}
                    label={item.label}
                    thumbSrc={HAT_SRC[item.id]}
                    onClick={() => patch({ hat: item.id as AvatarHatId })}
                  />
                ))}
              </ChipGrid>
            ) : null}

            {category === "glasses" ? (
              <ChipGrid>
                {AVATAR_GLASSES.map((item) => (
                  <ChipButton
                    key={item.id}
                    active={draft.glasses === item.id}
                    label={item.label}
                    thumbSrc={GLASSES_SRC[item.id]}
                    onClick={() =>
                      patch({ glasses: item.id as AvatarGlassesId })
                    }
                  />
                ))}
              </ChipGrid>
            ) : null}

            {category === "accessory" ? (
              <ChipGrid>
                {AVATAR_ACCESSORIES.map((item) => (
                  <ChipButton
                    key={item.id}
                    active={draft.accessory === item.id}
                    label={item.label}
                    thumbSrc={ACC_SRC[item.id]}
                    onClick={() =>
                      patch({ accessory: item.id as AvatarAccessoryId })
                    }
                  />
                ))}
              </ChipGrid>
            ) : null}

            {category === "bg" ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3">
                {AVATAR_BACKGROUNDS.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => patch({ bg: item.id as AvatarBgId })}
                    className={`flex items-center gap-2 rounded-2xl border px-2 py-2 text-[11px] font-bold ${
                      draft.bg === item.id
                        ? "border-[var(--rm-brand)] ring-2 ring-[color-mix(in_srgb,var(--rm-brand)_35%,transparent)]"
                        : "border-[var(--rm-border)]"
                    }`}
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border border-black/5 shadow-inner"
                      style={{ background: item.css }}
                    />
                    {item.label}
                  </motion.button>
                ))}
              </div>
            ) : null}
          </div>

          {message ? (
            <p className="text-[11px] font-medium text-[var(--rm-nav-active)]">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="mt-auto rounded-2xl bg-[var(--rm-brand)] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-[color-mix(in_srgb,var(--rm-brand)_35%,transparent)] transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "저장 중…" : "프로필 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{children}</div>
  );
}

function ChipButton({
  active,
  label,
  thumbSrc,
  onClick,
}: {
  active: boolean;
  label: string;
  thumbSrc?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      animate={active ? { scale: 1.03 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 18 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-[11px] font-bold ${
        active
          ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_14%,white)] text-[var(--rm-brand)] shadow-sm"
          : "border-[var(--rm-border)] bg-[var(--rm-bg-elevated)] text-[var(--rm-text-muted)]"
      }`}
    >
      {thumbSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${thumbSrc}?v=33`}
          alt=""
          className="h-10 w-10 rounded-lg bg-[var(--rm-bg-elevated)] object-contain p-0.5"
          draggable={false}
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 text-xs text-[var(--rm-text-faint)]">
          없음
        </span>
      )}
      {label}
    </motion.button>
  );
}

function AnimalChip({
  active,
  animal,
  variant,
  label,
  onClick,
}: {
  active: boolean;
  animal: AvatarPresetId;
  variant: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1.05 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 18 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-2xl border p-1 transition ${
        active
          ? "border-[var(--rm-brand)] bg-[color-mix(in_srgb,var(--rm-brand)_12%,white)] shadow-sm"
          : "border-[var(--rm-border)] bg-[var(--rm-bg-elevated)]"
      }`}
    >
      <StudentAvatarBadge
        config={{
          animal,
          variant,
          hat: "none",
          glasses: "none",
          accessory: "none",
          bg: "aurora",
        }}
        size="sm"
        className="rounded-xl"
        alt={label}
      />
      <span
        className={`text-[9px] font-bold ${
          active ? "text-[var(--rm-brand)]" : "text-[var(--rm-text-muted)]"
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}
